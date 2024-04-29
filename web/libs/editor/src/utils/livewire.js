/* eslint-disable */

export function Livewire() {}

this.mousedown = (event) => {
  // first time
  if (!self.started) {
    self.started = true;
    self.x0 = event._x;
    self.y0 = event._y;
    // clear vars
    clearPaths();
    clearParentPoints();
    // do the training from the first point
    const p = new dwv.math.FastPoint2D(event._x, event._y);
    scissors.doTraining(p);
    // add the initial point to the path
    const p0 = new dwv.math.Point2D(event._x, event._y);
    path.addPoint(p0);
    path.addControlPoint(p0);
  } else {
    // final point: at 'tolerance' of the initial point
    if (Math.abs(event._x - self.x0) < tolerance && Math.abs(event._y - self.y0) < tolerance) {
      // draw
      self.mousemove(event);
      // listen
      command.onExecute = fireEvent;
      command.onUndo = fireEvent;
      // debug
      // save command in undo stack
      app.addToUndoStack(command);
      // set flag
      self.started = false;
    }
    // anchor point
    else {
      path = currentPath;
      clearParentPoints();
      const pn = new dwv.math.FastPoint2D(event._x, event._y);
      scissors.doTraining(pn);
      path.addControlPoint(currentPath.getPoint(0));
    }
  }
};

this.mousemove = (event) => {
  if (!self.started) {
    return;
  }
  // set the point to find the path to
  let p = new dwv.math.FastPoint2D(event._x, event._y);
  scissors.setPoint(p);
  // do the work
  let results = 0;
  let stop = false;
  while (!parentPoints[p.y][p.x] && !stop) {
    results = scissors.doWork();

    if (results.length === 0) {
      stop = true;
    } else {
      // fill parents
      for (let i = 0; i < results.length - 1; i += 2) {
        const _p = results[i];
        const _q = results[i + 1];
        parentPoints[_p.y][_p.x] = _q;
      }
    }
  }

  // get the path
  currentPath = new dwv.math.Path();
  stop = false;
  while (p && !stop) {
    currentPath.addPoint(new dwv.math.Point2D(p.x, p.y));
    if (!parentPoints[p.y]) {
      stop = true;
    } else {
      if (!parentPoints[p.y][p.x]) {
        stop = true;
      } else {
        p = parentPoints[p.y][p.x];
      }
    }
  }
  currentPath.appenPath(path);

  // remove previous draw
  if (shapeGroup) {
    shapeGroup.destroy();
  }
  // create shape
  const factory = new dwv.tool.RoiFactory();
  shapeGroup = factory.create(currentPath.pointArray, self.style);
  shapeGroup.id(dwv.math.guid());

  // get the position group
  const posGroup = app.getDrawController().getCurrentPosGroup();
  // add shape group to position group
  posGroup.add(shapeGroup);

  // draw shape command
  command = new dwv.tool.DrawGroupCommand(shapeGroup, "livewire", app.getDrawController().getDrawLayer());
  // draw
  command.execute();
};

this.dblclick = (/*event*/) => {
  // save command in undo stack
  app.addToUndoStack(command);
  // set flag
  self.started = false;
};
