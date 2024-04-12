/**
 * Function that returns a random number between min and max including min and max
 */
export const random = (min: number, max?: number) => {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const Generator = {
  generateImageUrl({ width, height }) {
    return cy.document().then((doc) => {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      const centerX = width / 2;
      const centerY = height / 2;

      for (let k = 0; k < centerX; k += 50) {
        ctx.strokeRect(centerX - k, 0, k * 2, height);
      }
      for (let k = 0; k < centerY; k += 50) {
        ctx.strokeRect(0, centerY - k, width, k * 2);
      }

      const dataUrl = canvas.toDataURL("image/png");

      return dataUrl;
    });
  },
  generatePixeledImageUrl({ width, height }) {
    return cy.document().then((doc) => {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      const centerX = width / 2;
      const centerY = height / 2;

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          ctx.fillStyle = `rgb(${random(255)},${random(255)},${random(255)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      const dataUrl = canvas.toDataURL("image/png");

      return dataUrl;
    });
  },
};
