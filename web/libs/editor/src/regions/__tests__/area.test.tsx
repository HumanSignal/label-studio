describe("Area", () => {
  test("Compute rectangle area", () => {
    const rectangle = {
      width: 68,
      height: 100,
    }
    expect(rectangle.area()).toEqual(6800)
  })

  test("Compute circle area", () => {
    const circle = {
      radius: 10
    }
    expect(Math.abs(circle.area() - 314.159)).toBeLessThan(1e-2)
  })

  test("Compute ellipse area", () => {
    const ellipse = {
      radiusX: 10,
      radiusY: 5,
    }
    expect(Math.abs(ellipse.area() - 157.079)).toBeLessThan(1e-2)
  })

  test("Compute polygon area", () => {
    const polygon = {
      vertices: [
        {x:0, y: 0}, // A
        {x: 4, y: 0}, // B
        {x: 5, y: 1}, // C
        {x: 4, y: 2}, // D
        {x: 0, y: 2}, // E
      ]
      // Visual representation
      // -C-
      // B-D
      // ---
      // ---
      // ---
      // A-E
    }
    expect(polygon.area()).toEqual(9)
  })

  test("Brush area computation doesn't crash and returns undefined", () => {
    const brush = {}
    expect(brush.area()).toBeUndefined()
  })
})
