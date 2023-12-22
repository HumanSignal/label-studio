import Konva from 'konva';

const EVENTS_NAME = 'tr-konva';

class LSTransformerOld extends Konva.Transformer {
  get _outerBack() {
    return this.getStage()?.findOne(this.attrs.backSelector);
  }

  setNodes(nodes = []) {

    super.setNodes(nodes);

    if (this._outerBack) {
      this._proxyDrag(this._outerBack);
    }
    return this;
  }

  detach() {
    this._outerBack?.off('.' + EVENTS_NAME);
    super.detach();
  }

  update() {
    const { x, y, width, height } = this._getNodeRect();
    const rotation = this.rotation();
    const outerBack = this._outerBack;

    super.update();

    if (outerBack) {
      const backAbsScale = this.getAbsoluteScale();
      const trAbsScale = outerBack.getAbsoluteScale();
      const scale = {
        x: backAbsScale.x / trAbsScale.x,
        y: backAbsScale.y / trAbsScale.y,
      };

      outerBack.setAttrs({
        x: (x - this.getStage().getAttr('x')) * scale.x,
        y: (y - this.getStage().getAttr('y')) * scale.y,
        width: width * scale.x,
        height: height * scale.y,
        rotation,
      }).getLayer().batchDraw();
    }
  }
}

Konva['LSTransformerOld'] = LSTransformerOld;

export default 'LSTransformerOld';
