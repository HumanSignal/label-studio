// Fixture for ds-plugins.test.ts: the design system itself may render raw elements.
export const InsideDs = ({ onPick }: { onPick: () => void }) => (
  <button type="button" style={{ color: "red" }} onClick={onPick}>
    Go
  </button>
);
