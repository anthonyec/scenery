export default class CanvasRender {
  constructor({ context }) {
    this.context = context;
  }

  clearRect(x, y, width, height) {
    this.context.clearRect(x, y, width, height);
  }

  drawImage(
    target,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight
  ) {
    console.log('drawImage');

    this.context.drawImage(
      target,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight
    );
  }
}
