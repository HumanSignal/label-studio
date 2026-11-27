/**
 * Unit tests for acceptInteractiveMask (ml-interactive/actions.ts).
 *
 * BROS-1422 — when SAM2 (interactive ML) is active, Vector / VideoVector must
 * always produce CLOSED polygons. The accept path is the SAM2-only entry point,
 * so it ignores the control's `closable=false` and always closes the traced
 * contour. This supersedes BROS-1221, which left a non-closable vector as an
 * open boundary path.
 *
 * Uses the real `maskToLargestShape` over a solid rectangle mask (no module
 * mock) so we exercise the actual code path AND avoid leaking a mocked
 * mask-output module into the sibling mask-output tests in the same run.
 */

import { acceptInteractiveMask } from "../actions";

const W = 64;
const H = 64;

function buildRectMask() {
  const mask = new Uint8Array(W * H);
  for (let y = 12; y < 52; y++) {
    for (let x = 12; x < 52; x++) {
      mask[y * W + x] = 1;
    }
  }
  return mask;
}

function makeControl({ closable, isVideo }: { closable: boolean; isVideo: boolean }) {
  const created: any[] = [];
  const imageTag = { type: isVideo ? "video" : "image", frame: 3, currentFrame: 3 };
  const control = {
    interactiveMaskData: buildRectMask(),
    interactiveMaskWidth: W,
    interactiveMaskHeight: H,
    interactiveTraceResolution: 512,
    interactiveSmoothing: 0.8,
    closable,
    maxpoints: null,
    toname: "img",
    getResultValue: () => ({}),
    clearInteractiveMask: mock(() => {}),
    annotation: {
      names: new Map<string, any>([["img", imageTag]]),
      createResult: mock((data: any) => {
        created.push(data);
        return { drawingTimeout: null, setValue: mock(() => {}) };
      }),
    },
  };
  return { control, created };
}

describe("acceptInteractiveMask — SAM2 vectors are always closed (BROS-1422)", () => {
  it("forces closed=true for an image Vector even when control.closable=false", () => {
    const { control, created } = makeControl({ closable: false, isVideo: false });

    acceptInteractiveMask(control, { output: "polygon" } as any);

    expect(created).toHaveLength(1);
    expect(created[0].closed).toBe(true);
  });

  it("forces closed=true for a VideoVector and stores it in the keyframe", () => {
    const { control, created } = makeControl({ closable: false, isVideo: true });

    acceptInteractiveMask(control, { output: "polygon" } as any);

    expect(created).toHaveLength(1);
    expect(created[0].sequence[0].closed).toBe(true);
  });

  it("still produces a closed polygon when control.closable=true", () => {
    const { control, created } = makeControl({ closable: true, isVideo: false });

    acceptInteractiveMask(control, { output: "polygon" } as any);

    expect(created[0].closed).toBe(true);
  });
});
