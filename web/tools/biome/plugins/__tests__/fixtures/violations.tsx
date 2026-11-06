// Fixture for ds-plugins.test.ts: each element below is one design-system violation (lines asserted there).
export const Violations = ({ u, onPick }: { u: unknown; onPick: () => void }) => (
  <div>
    <div style={{ color: "red", position: "absolute" }} />
    <button type="button" onClick={onPick}>
      Go
    </button>
    <select aria-label="pick" />
    <table aria-label="rows" />
    <input type="checkbox" aria-label="on" />
    <input type="radio" aria-label="one" />
    <Badge look="outline" variant="primary">
      Draft
    </Badge>
    <Badge variant="primary" icon={<span />}>
      Draft
    </Badge>
    <Avatar size={24} user={u} />
  </div>
);
