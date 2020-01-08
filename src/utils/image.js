/**
 * Transform RGBA Canvas to Binary Matrix
 * @param {object} canvas
 * @param {object} shape
 */
export function canvasToBinaryMatrix(canvas, shape) {
  let currentLayer = canvas.stageRef.getLayers().filter(layer => layer.attrs.id === shape.id);

  let canv = currentLayer[0].canvas.context;

  let initialArray = canv.getImageData(0, 0, canv.canvas.width, canv.canvas.height);

  let binaryMatrix = [];

  for (
    let i = 0;
    i < canvas.stageRef.bufferCanvas.context.canvas.width * canvas.stageRef.bufferCanvas.context.canvas.height * 4;
    i += 4
  ) {
    let alpha = initialArray.data[i + 0];
    let r = initialArray.data[i + 1];
    let g = initialArray.data[i + 2];
    let b = initialArray.data[i + 3];

    if (alpha > 0 || r > 0 || g > 0 || b > 0) {
      binaryMatrix.push(1);
    } else {
      binaryMatrix.push(0);
    }
  }

  return binaryMatrix;
}
