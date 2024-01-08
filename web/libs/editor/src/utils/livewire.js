/* eslint-disable */

export function Livewire() {}

this.mousedown = function(event) {
  // first time
  if (!self.started) {
    self.started = true;
    self.x0 = event._x;
    self.y0 = event._y;
    // clear vars
    clearPaths();
    clearParentPoints();
    // do the training from the first point
    var p = new dwv.math.FastPoint2D(event._x, event._y);
    scissors.doTraining(p);
    // add the initial point to the path
    var p0 = new dwv.math.Point2D(event._x, event._y);
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
      var pn = new dwv.math.FastPoint2D(event._x, event._y);
      scissors.doTraining(pn);
      path.addControlPoint(currentPath.getPoint(0));
    }
  }
};

this.mousemove = function(event) {
  if (!self.started) {
    return;
  }
  // set the point to find the path to
  var p = new dwv.math.FastPoint2D(event._x, event._y);
  scissors.setPoint(p);
  // do the work
  var results = 0;
  var stop = false;
  while (!parentPoints[p.y][p.x] && !stop) {
    results = scissors.doWork();

    if (results.length === 0) {
      stop = true;
    } else {
      // fill parents
      for (var i = 0; i < results.length - 1; i += 2) {
        var _p = results[i];
        var _q = results[i + 1];
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
  var factory = new dwv.tool.RoiFactory();
  shapeGroup = factory.create(currentPath.pointArray, self.style);
  shapeGroup.id(dwv.math.guid());

  // get the position group
  var posGroup = app.getDrawController().getCurrentPosGroup();
  // add shape group to position group
  posGroup.add(shapeGroup);

  // draw shape command
  command = new dwv.tool.DrawGroupCommand(shapeGroup, "livewire", app.getDrawController().getDrawLayer());
  // draw
  command.execute();
};

this.dblclick = function(/*event*/) {
  // save command in undo stack
  app.addToUndoStack(command);
  // set flag
  self.started = false;
};
