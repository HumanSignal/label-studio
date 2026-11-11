import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MIRROR_PREFIX, removeStaleMirrors } from "../check";

let webRoot: string;
const minutes = (n: number) => n * 60 * 1000;

beforeAll(() => {
  webRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ds-check-mirror-"));
  for (const name of [`${MIRROR_PREFIX}old`, `${MIRROR_PREFIX}fresh`, "apps"]) {
    fs.mkdirSync(path.join(webRoot, name, "x"), { recursive: true });
    fs.writeFileSync(path.join(webRoot, name, "x", "f.tsx"), "");
  }
  const old = new Date(Date.now() - minutes(30));
  fs.utimesSync(path.join(webRoot, `${MIRROR_PREFIX}old`), old, old);
});

afterAll(() => fs.rmSync(webRoot, { recursive: true, force: true }));

describe("ds-check mirror folders", () => {
  test("a mirror left behind by a killed run is removed; a live one and other folders are kept", () => {
    const removed = removeStaleMirrors(webRoot);
    expect(removed).toEqual([`${MIRROR_PREFIX}old`]);
    expect(fs.existsSync(path.join(webRoot, `${MIRROR_PREFIX}old`))).toBe(false);
    expect(fs.existsSync(path.join(webRoot, `${MIRROR_PREFIX}fresh`))).toBe(true);
    expect(fs.existsSync(path.join(webRoot, "apps"))).toBe(true);
  });
});
