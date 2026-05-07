from __future__ import annotations

import base64
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from fastapi import Body, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.staticfiles import StaticFiles
from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright
from pydantic import BaseModel, Field, HttpUrl


AUTH_TOKEN = os.getenv("AGENT_GATEWAY_BEARER_TOKEN")
ALLOWED_HOSTS = [host.strip().lower() for host in os.getenv("AGENT_ALLOWED_HOSTS", "").split(",") if host.strip()]
RECORDING_DIR = Path(os.getenv("AGENT_RECORDING_DIR", "/recordings"))
DEFAULT_APP_URL = os.getenv("AGENT_DEFAULT_APP_URL", "http://host.docker.internal:8082")
HEADLESS = os.getenv("AGENT_HEADLESS", "true").lower() not in {"0", "false", "no"}

RECORDING_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Loading Mode Local Browser Agent Gateway",
    version="0.1.0",
    description=(
        "Runs a local Docker-hosted Chromium agent that can open the Label Studio app, "
        "click/type/scroll through the UI, capture screenshots, and record video."
    ),
)
app.mount("/recordings", StaticFiles(directory=RECORDING_DIR), name="recordings")


@dataclass
class BrowserSession:
    session_id: str
    app_url: str
    playwright: Playwright
    browser: Browser
    context: BrowserContext
    page: Page
    video_path: str | None = None


sessions: dict[str, BrowserSession] = {}


class CreateSessionRequest(BaseModel):
    app_url: HttpUrl | None = Field(
        default=None,
        description="URL for the Label Studio app or route to inspect. Defaults to AGENT_DEFAULT_APP_URL.",
    )
    width: int = Field(1280, ge=640, le=1920)
    height: int = Field(720, ge=480, le=1200)
    timeout_ms: int = Field(30_000, ge=5_000, le=120_000)


class SessionResponse(BaseModel):
    session_id: str
    app_url: str
    width: int
    height: int


class ClickRequest(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    button: Literal["left", "right", "middle", "double"] = "left"


class TypeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class KeypressRequest(BaseModel):
    keys: list[str] = Field(..., min_length=1, max_length=4)


class ScrollRequest(BaseModel):
    direction: Literal["up", "down"] = "down"
    amount: int = Field(600, ge=1, le=5000, description="Pixel delta to scroll.")


class NavigateRequest(BaseModel):
    url: HttpUrl
    timeout_ms: int = Field(30_000, ge=5_000, le=120_000)


class StopRequest(BaseModel):
    close_browser: bool = True


class ScreenshotResponse(BaseModel):
    session_id: str
    mime_type: str = "image/png"
    image_base64: str


class StopResponse(BaseModel):
    session_id: str
    video_path: str | None
    video_url: str | None
    closed: bool


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not AUTH_TOKEN:
        return

    if authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def validate_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http and https URLs are supported.")

    if not ALLOWED_HOSTS:
        return

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL must include a hostname.")

    normalized = hostname.lower()
    if normalized in ALLOWED_HOSTS:
        return
    if any(normalized.endswith(f".{allowed}") for allowed in ALLOWED_HOSTS):
        return

    raise HTTPException(status_code=400, detail=f"Host {hostname!r} is not in AGENT_ALLOWED_HOSTS.")


def get_session(session_id: str) -> BrowserSession:
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown session_id.")
    return session


def normalize_key(key: str) -> str:
    aliases = {
        "alt": "Alt",
        "backspace": "Backspace",
        "cmd": "Meta",
        "command": "Meta",
        "control": "Control",
        "ctrl": "Control",
        "delete": "Delete",
        "enter": "Enter",
        "escape": "Escape",
        "esc": "Escape",
        "meta": "Meta",
        "option": "Alt",
        "shift": "Shift",
        "space": "Space",
        "tab": "Tab",
    }
    return aliases.get(key.lower(), key)


def public_recording_url(request: Request, video_path: str | None) -> str | None:
    if not video_path:
        return None

    path = Path(video_path)
    try:
        relative = path.relative_to(RECORDING_DIR)
    except ValueError:
        return None

    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/recordings/{relative.as_posix()}"


async def close_session(session_id: str, close_browser: bool) -> str | None:
    session = get_session(session_id)
    video = session.page.video
    if close_browser:
        await session.context.close()
        if video:
            session.video_path = await video.path()
        await session.browser.close()
        await session.playwright.stop()
        sessions.pop(session_id, None)
    elif video and not session.video_path:
        # Playwright finalizes video on context close; an in-progress session has no file yet.
        session.video_path = None
    return session.video_path


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions", response_model=SessionResponse, dependencies=[Depends(require_auth)])
async def create_session(request: CreateSessionRequest | None = Body(default=None)) -> SessionResponse:
    request = request or CreateSessionRequest()
    app_url = str(request.app_url or DEFAULT_APP_URL)
    validate_url(app_url)

    session_id = uuid.uuid4().hex
    session_recording_dir = RECORDING_DIR / session_id
    session_recording_dir.mkdir(parents=True, exist_ok=True)

    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=HEADLESS,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    context = await browser.new_context(
        viewport={"width": request.width, "height": request.height},
        record_video_dir=str(session_recording_dir),
        record_video_size={"width": request.width, "height": request.height},
    )
    page = await context.new_page()
    page.set_default_timeout(request.timeout_ms)
    await page.goto(app_url, wait_until="domcontentloaded", timeout=request.timeout_ms)

    sessions[session_id] = BrowserSession(
        session_id=session_id,
        app_url=app_url,
        playwright=playwright,
        browser=browser,
        context=context,
        page=page,
    )

    return SessionResponse(session_id=session_id, app_url=app_url, width=request.width, height=request.height)


@app.get("/sessions", dependencies=[Depends(require_auth)])
async def list_sessions() -> dict[str, list[str]]:
    return {"session_ids": sorted(sessions)}


@app.get("/sessions/{session_id}/screenshot", response_model=ScreenshotResponse, dependencies=[Depends(require_auth)])
async def screenshot(session_id: str) -> ScreenshotResponse:
    session = get_session(session_id)
    image = await session.page.screenshot(type="png", full_page=False)
    return ScreenshotResponse(session_id=session_id, image_base64=base64.b64encode(image).decode("ascii"))


@app.post("/sessions/{session_id}/click", dependencies=[Depends(require_auth)])
async def click(session_id: str, request: ClickRequest) -> dict[str, str]:
    session = get_session(session_id)
    click_count = 2 if request.button == "double" else 1
    button = "left" if request.button == "double" else request.button
    await session.page.mouse.click(request.x, request.y, button=button, click_count=click_count)
    return {"status": "ok"}


@app.post("/sessions/{session_id}/type", dependencies=[Depends(require_auth)])
async def type_text(session_id: str, request: TypeRequest) -> dict[str, str]:
    session = get_session(session_id)
    await session.page.keyboard.type(request.text, delay=20)
    return {"status": "ok"}


@app.post("/sessions/{session_id}/keypress", dependencies=[Depends(require_auth)])
async def keypress(session_id: str, request: KeypressRequest) -> dict[str, str]:
    session = get_session(session_id)
    key_combo = "+".join(normalize_key(key) for key in request.keys)
    await session.page.keyboard.press(key_combo)
    return {"status": "ok"}


@app.post("/sessions/{session_id}/scroll", dependencies=[Depends(require_auth)])
async def scroll(session_id: str, request: ScrollRequest) -> dict[str, str]:
    session = get_session(session_id)
    delta = -request.amount if request.direction == "up" else request.amount
    await session.page.mouse.wheel(0, delta)
    return {"status": "ok"}


@app.post("/sessions/{session_id}/navigate", dependencies=[Depends(require_auth)])
async def navigate(session_id: str, request: NavigateRequest) -> dict[str, str]:
    session = get_session(session_id)
    url = str(request.url)
    validate_url(url)
    await session.page.goto(url, wait_until="domcontentloaded", timeout=request.timeout_ms)
    session.app_url = url
    return {"status": "ok"}


@app.post("/sessions/{session_id}/stop", response_model=StopResponse, dependencies=[Depends(require_auth)])
async def stop(session_id: str, request: Request, body: StopRequest | None = Body(default=None)) -> StopResponse:
    body = body or StopRequest()
    video_path = await close_session(session_id, body.close_browser)
    return StopResponse(
        session_id=session_id,
        video_path=video_path,
        video_url=public_recording_url(request, video_path),
        closed=body.close_browser,
    )


@app.delete("/sessions/{session_id}", dependencies=[Depends(require_auth)])
async def delete_session(session_id: str) -> dict[str, str]:
    await close_session(session_id, close_browser=True)
    return {"status": "closed"}


@app.on_event("shutdown")
async def shutdown() -> None:
    for session_id in list(sessions):
        try:
            await close_session(session_id, close_browser=True)
        except Exception:
            pass
