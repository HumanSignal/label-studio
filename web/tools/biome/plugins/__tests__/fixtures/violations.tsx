// Fixture for ds-plugins.test.ts: one violation per element (lines asserted there); the radio input is allowed (no DS Radio yet).
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
    <Badge look="outlined" variant="primary">
      Draft
    </Badge>
    <Badge variant="primary" icon={<span />}>
      Draft
    </Badge>
    <Avatar size={24} user={u} />
    <Button look="string" onClick={onPick}>
      Go
    </Button>
    <Button look="outline" onClick={onPick} />
  </div>
);
