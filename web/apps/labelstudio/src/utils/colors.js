export const LABELS_PALETTE = "FFA39E D4380D FFC069 AD8B00 D3F261 389E0D 5CDBD3 096DD9 ADC6FF 9254DE F759AB".split(" ").map(s => "#" + s);

export function* Palette(colors = LABELS_PALETTE) {
  let index = 0;
  while (true) {
    yield colors[index];
    index = (index + 1) % colors.length;
  }
}

window.Palette = Palette;
