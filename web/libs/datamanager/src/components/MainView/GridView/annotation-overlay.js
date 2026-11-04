import { decode } from "@thi.ng/rle-pack";
import chroma from "chroma-js";
import ColorScheme from "pleasejs";

export function selectPreviewAnnotation(annotations = []) {
  return annotations.filter((a) => !a.was_cancelled).sort((a, b) => Number(b.id) - Number(a.id))[0] ?? null;
}

export function getImageLabels(config, field) {
  const document = new DOMParser().parseFromString(config || "<View/>", "text/xml");
  const elements = Array.from(document.getElementsByTagName("*"));
  const imageNames = elements
    .filter((el) => el.tagName.toLowerCase() === "image" && el.getAttribute("value") === `$${field}`)
    .map((el) => el.getAttribute("name"));
  const colors = {};
  for (const el of elements.filter((el) => el.tagName.toLowerCase() === "label")) {
    const label = el.getAttribute("alias") || el.getAttribute("value");
    colors[`${el.parentElement?.getAttribute("name")}:${label}`] =
      el.getAttribute("background") || ColorScheme.make_color({ seed: el.getAttribute("value") })[0];
  }
  return { imageNames, colors };
}

export function decodeBrushMask(rle, width, height, color) {
  const length = width * height * 4;
  // Check the RLE header before decoding so corrupt data cannot allocate arbitrary memory.
  const encodedLength = rle?.length >= 4 ? rle[0] * 2 ** 24 + rle[1] * 2 ** 16 + rle[2] * 256 + rle[3] : -1;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    length > 128 * 1024 * 1024 ||
    encodedLength !== length
  )
    throw new Error("Invalid brush dimensions");
  const decoded = decode(rle);
  if (decoded.length !== length) throw new Error("Invalid brush mask");
  const pixels = new Uint8ClampedArray(decoded);
  const [r, g, b] = chroma(color).rgb();
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  }
  return pixels;
}

// Bound visible-card requests; queued work is skipped after scrolling away or hiding annotations.
let active = 0;
const queue = [];
export function loadGridPreview(load, isCurrent) {
  return new Promise((resolve, reject) => {
    queue.push({ load, isCurrent, resolve, reject });
    drain();
  });
}
function drain() {
  while (active < 4 && queue.length) {
    const job = queue.shift();
    if (!job.isCurrent()) {
      job.resolve(null);
      continue;
    }
    active++;
    Promise.resolve()
      .then(job.load)
      .then(job.resolve, job.reject)
      .finally(() => {
        active--;
        drain();
      });
  }
}
