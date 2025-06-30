renderer: new Grid(this.layers.grid, {
  axisMode: "x-only",
  approxXTicks: 30,
  onHover: (x: number, y: number) => {
    // Clear cursor if PlayHead is being interacted with or hovered
    if (this.interactionManager.hasActive() || this.isPlayHeadHovered()) {
      if (this._cursorTime !== undefined) {
        this._cursorTime = undefined;
        this.draw();
      }
      return;
    }

    const time = this.pxToTime(x);
    this._cursorTime = time;
    this.draw();
  },
  onHoverExit: () => {
    // ... existing code ...
  },
});
