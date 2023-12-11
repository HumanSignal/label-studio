import Konva from 'konva';

import IconRotate from '../../assets/icons/rotate.svg';

const EVENTS_NAME = 'tr-konva';

// Copies of local methods from Konva's original implementation
function getCenter(shape) {
  return {
    x: shape.x +
      (shape.width / 2) * Math.cos(shape.rotation) +
      (shape.height / 2) * Math.sin(-shape.rotation),
    y: shape.y +
      (shape.height / 2) * Math.cos(shape.rotation) +
      (shape.width / 2) * Math.sin(shape.rotation),
  };
}

function rotateAroundPoint(shape, angleRad, point) {
  const x = point.x +
    (shape.x - point.x) * Math.cos(angleRad) -
    (shape.y - point.y) * Math.sin(angleRad);
  const y = point.y +
    (shape.x - point.x) * Math.sin(angleRad) +
    (shape.y - point.y) * Math.cos(angleRad);

  return {
    ...shape,
    rotation: shape.rotation + angleRad,
    x,
    y,
  };
}

function rotateAroundCenter(shape, deltaRad) {
  const center = getCenter(shape);

  return rotateAroundPoint(shape, deltaRad, center);
}

function getSnap(snaps, newRotationRad, tol) {
  let snapped = newRotationRad;

  for (let i = 0; i < snaps.length; i++) {
    const angle = Konva.getAngle(snaps[i]);

    const absDiff = Math.abs(angle - newRotationRad) % (Math.PI * 2);
    const dif = Math.min(absDiff, Math.PI * 2 - absDiff);

    if (dif < tol) {
      snapped = angle;
    }
  }
  return snapped;
}

class LSTransformer extends Konva.Transformer {
  isMouseOver = false;
  isMouseDown = false;

  initialRotationDelta = 0;
  origin;

  constructor(props) {
    super(props);

    if (props.rotateEnabled)
      this.createRotateButton();
  }

  // Here starts the configuration of the rotation tool
  createRotateButton() {
    const rotateList = this.refreshRotationList();

    for (const obj in rotateList) {
      const rotateButton = new Konva.Circle({
        radius: 20,
        name: `rotate-${obj}`,
        dragDistance: 0,
        draggable: true,
        x: rotateList[obj].x,
        y: rotateList[obj].y,
      });

      this.add(rotateButton);
      rotateButton.moveToBottom(); // to not overlap other controls

      rotateButton.on('mousedown touchstart', this.handleMouseDown);

      rotateButton.on('mouseover', () => {
        if (!this.isMouseDown) {
          this.getStage().content.style.cursor = `url(${IconRotate}) 16 16, pointer`;
        }

        this.isMouseOver = true;
      });

      rotateButton.on('mouseout', () => {
        this.isMouseOver = false;

        if (!this.isMouseDown) {
          this.getStage().content.style.cursor = '';
        }
      });

      rotateButton.on('dragstart', (e) => {
        const anchorNode = this.findOne('.' + this._movingAnchorName);

        anchorNode.stopDrag();
        e.cancelBubble = true;
      });

      rotateButton.on('dragend', (e) => {
        e.cancelBubble = true;
      });
    }
  }

  handleMouseDown = (e) => {
    const stage = this.getStage();
    const pp = stage?.getPointerPosition();

    if (!stage || !pp) return;

    const shape = this._getNodeRect();
    const origin = getCenter(shape);
    const dx = pp.x - origin.x;
    const dy = pp.y - origin.y;
    const azimuth = (Math.PI / 2 - Math.atan2(-dy, dx));

    stage.content.style.cursor = `url(${IconRotate}) 16 16, pointer`;
    this.isMouseDown = true;
    this._movingAnchorName = e.target.name().split(' ')[0];

    // we save angle between vector to current pointer and shape rotation
    // and we keep this angle the same during mousemove by changing shape rotation
    this.initialRotationDelta = azimuth - shape.rotation;
    this.origin = origin;

    if (window) {
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('touchmove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp, true);
      window.addEventListener('touchend', this.handleMouseUp, true);
    }

    this._fire('transformstart', { evt: e, target: this.getNode() });
    this._nodes.forEach((target) => {
      target._fire('transformstart', { evt: e, target });
    });
  };

  handleMouseUp = (e) => {
    this.isMouseDown = false;
    this.origin = undefined;

    if (!this.isMouseOver) {
      this.getStage().content.style.cursor = '';
    }

    if (window) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('touchmove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp, true);
      window.removeEventListener('touchend', this.handleMouseUp, true);
    }

    const node = this.getNode();

    this._fire('transformend', { evt: e, target: node });
    if (node) {
      this._nodes.forEach((target) => {
        target._fire('transformend', { evt: e, target });
      });
    }
    this._movingAnchorName = '';
  };

  handleMouseMove = (e) => {
    const stage = this.getStage();

    if (!this.isMouseDown || !this.origin || !stage) return;

    // register coordinates outside the stage into the stage
    stage.setPointersPositions(e);
    const pp = stage.getPointerPosition();
    const shape = this._getNodeRect();

    if (!pp) return;

    const dx = pp.x - this.origin.x;
    const dy = pp.y - this.origin.y;
    // @todo why such signs? but they produce correct angles in every quadrant
    const azimuth = (Math.PI / 2 - Math.atan2(-dy, dx));

    const newRotation = azimuth - this.initialRotationDelta;

    // in case we have rotation snap enabled
    const tol = Konva.getAngle(this.rotationSnapTolerance());
    const snappedRot = getSnap(this.rotationSnaps(), newRotation, tol);
    const diff = snappedRot - shape.rotation;
    const rotated = rotateAroundCenter(shape, diff);

    this._fitNodesInto(rotated, e);
  };

  refreshRotationList() {
    return {
      'top-left': {
        x: 0,
        y: 0,
      },
      'top-right': {
        x: this.getWidth(),
        y: 0,
      },
      'bottom-left': {
        x: 0,
        y: this.getHeight(),
      },
      'bottom-right': {
        x: this.getWidth(),
        y: this.getHeight(),
      },
    };
  }

  // Here starts override methods from LSTransform

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
    this.refreshRotationList();

    const { x, y, width, height } = this._getNodeRect();
    const rotation = this.rotation();
    const outerBack = this._outerBack;
    const rotateList = this.refreshRotationList();

    for (const obj in rotateList) {
      const anchorNode = this.findOne(`.rotate-${obj}`);

      if (anchorNode) {
        anchorNode.setAttrs({
          x: rotateList[obj].x,
          y: rotateList[obj].y,
        }).getLayer().batchDraw();
      }
    }

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

Konva['LSTransformer'] = LSTransformer;

export default 'LSTransformer';
