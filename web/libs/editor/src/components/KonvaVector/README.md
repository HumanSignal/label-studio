# KonvaVector Component

## Point Creation Management

The KonvaVector component uses a **PointCreationManager** as the **single source of truth** for all point creation, whether it's regular points or bezier points. This ensures consistent behavior and centralized point creation logic.

### Ref Methods

The component exposes three methods through the ref:

```typescript
interface KonvaVectorRef {
    // ... existing methods ...

    // Programmatic point creation methods
    startPoint: (x: number, y: number) => boolean;
    updatePoint: (x: number, y: number) => boolean;
    commitPoint: (x: number, y: number) => boolean;
}
```

### Usage Example

```tsx
import { useRef } from "react";
import { KonvaVector, type KonvaVectorRef } from "./KonvaVector";

function MyComponent() {
    const vectorRef = useRef<KonvaVectorRef>(null);

    const handleProgrammaticPointCreation = () => {
        if (!vectorRef.current) return;

        // Start creating a point at (100, 200)
        const started = vectorRef.current.startPoint(100, 200);
        if (!started) return;

        // Simulate dragging to create a bezier point
        // Move 10 pixels away from start position
        vectorRef.current.updatePoint(110, 210);

        // Continue dragging
        vectorRef.current.updatePoint(120, 220);

        // Commit the point creation
        vectorRef.current.commitPoint(125, 225);
    };

    const handleSimplePointCreation = () => {
        if (!vectorRef.current) return;

        // Start creating a point
        const started = vectorRef.current.startPoint(150, 250);
        if (!started) return;

        // Small movement (less than 5 pixels) creates a regular point
        vectorRef.current.updatePoint(152, 252);

        // Commit the point
        vectorRef.current.commitPoint(152, 252);
    };

    return (
        <KonvaVector
            ref={vectorRef}
            initialPoints={[]}
            onPointsChange={setPoints}
            allowBezier={true}
            allowClose={false}
            width={800}
            height={600}
        />
    );
}
```

### How It Works

1. **startPoint(x, y)**:
   - Initializes the point creation process
   - Sets a flag that we're about to draw
   - Returns `true` if successful, `false` if already creating or constraints
     not met

2. **updatePoint(x, y)**:
   - Called continuously with current cursor position
   - Creates a bezier point if drag distance exceeds 5 pixels from start
     position
   - Updates control points for bezier curves
   - Returns `true` if successful, `false` if not creating

3. **commitPoint(x, y)**:
   - Finalizes the point creation process
   - Creates a regular point if no point was created during updatePoint
     (regardless of final drag distance)
   - Finalizes bezier point with current control points if one was created
     during updatePoint
   - Resets the creation state
   - Returns `true` if successful, `false` if not creating

## Programmatic Point Transformation

The component exposes four methods for programmatic point transformation:

### `translatePoints(dx, dy, pointIds?)`
Translates points by the specified delta. If `pointIds` is provided, only those points are transformed.

```typescript
// Translate all points by (50, 30)
vectorRef.current?.translatePoints(50, 30);

// Translate specific points by (20, -20)
vectorRef.current?.translatePoints(20, -20, ["point1", "point2"]);
```

### `rotatePoints(angle, centerX, centerY, pointIds?)`
Rotates points around the specified center point. Angle is in degrees.

```typescript
// Rotate all points 45° around the shape's center (calculated automatically)
vectorRef.current?.rotatePoints(45, 0, 0);

// Rotate specific points 90° around a specific point
vectorRef.current?.rotatePoints(90, 200, 150, ["point1", "point2"]);
```

### `scalePoints(scaleX, scaleY, centerX, centerY, pointIds?)`
Scales points around the specified center point.

```typescript
// Scale all points 1.5x around the shape's center (calculated automatically)
vectorRef.current?.scalePoints(1.5, 1.5, 0, 0);

// Scale specific points 0.8x around a specific point
vectorRef.current?.scalePoints(0.8, 0.8, 200, 150, ["point1", "point2"]);
```

### `transformPoints(transformation, pointIds?)`
Applies a complex transformation combining translation, rotation, and scaling.

```typescript
// Transform all points around the shape's center (calculated automatically)
vectorRef.current?.transformPoints({
  dx: 30,           // Translation X
  dy: -20,          // Translation Y
  rotation: 30,     // Rotation in degrees
  scaleX: 1.2,      // Scale X
  scaleY: 0.9,      // Scale Y
  // centerX and centerY are calculated automatically when not provided
});

// Transform specific points around a specific center
vectorRef.current?.transformPoints({
  dx: 30,
  dy: -20,
  rotation: 30,
  scaleX: 1.2,
  scaleY: 0.9,
  centerX: 200,     // Center point for rotation/scaling
  centerY: 150,
}, ["point1", "point2"]);
```

### Notes:
- All transformation methods work with both regular and bezier points
- Bezier control points are automatically transformed along with their main points
- If `pointIds` is not provided, all points are transformed as a single shape
- When transforming the entire shape (no `pointIds`), the center point is automatically calculated from the bounding box of all points (including control points)
- For selective transformations, you must provide the center point for rotation/scaling operations
- Transformations are applied immediately and trigger `onPointsChange`
- These methods work independently of the visual transformer

## Shape Analysis

### `getShapeBoundingBox()`
Returns the bounding box of the entire shape, including bezier curves.

```typescript
const bbox = vectorRef.current?.getShapeBoundingBox();
// Returns: { left: number, top: number, right: number, bottom: number }
```

**Features:**
- **Accurate Bounding Box**: Calculates the true bounding box including bezier curve extrema
- **Mathematical Precision**: Uses derivative calculations to find curve extrema points
- **Complete Coverage**: Ensures the entire shape (including curved segments) is contained within the bounding box

### Single Source of Truth

The PointCreationManager is the **single source of truth** for all point creation:

- **All point creation goes through the manager**: Whether it's manual mouse interactions, programmatic calls, or shift-click operations
- **Consistent behavior**: All point creation follows the same logic and constraints
- **Centralized validation**: All bounds checking, point limits, and bezier settings are handled in one place
- **No conflicts**: The manager prevents duplicate point creation and ensures proper state management

### Integration with Mouse Events

The PointCreationManager is integrated with the existing mouse handlers:

- When the manager is creating a point (`isCreating()` returns `true`), the
  regular click-drag and shift-click-drag behaviors are disabled
- This prevents conflicts between programmatic and manual point creation
- The manager respects all the same constraints as manual creation (bounds
  checking, point limits, etc.)

### Singleton Pattern

The PointCreationManager uses a singleton pattern, ensuring only one instance
exists per KonvaVector component. This prevents multiple point creation
processes from running simultaneously.

### Constraints

The manager respects all the same constraints as manual point creation:

- `maxPoints` limit
- `minPoints` requirement
- `allowBezier` setting
- `skeletonEnabled` mode
- Canvas bounds (always enforced)

### Skeleton Mode Support

When `skeletonEnabled` is true, new points are connected to the `activePointId`
instead of the last point in the array, allowing for branching path creation.
