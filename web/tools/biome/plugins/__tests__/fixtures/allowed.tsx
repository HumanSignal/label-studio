// Fixture for ds-plugins.test.ts: design-system usage the plugins must not report.
export const Allowed = ({ u, onPick }: { u: unknown; onPick: () => void }) => (
  <div style={{ position: "absolute", top: 0, width: 120 }}>
    <Button look="ghost" onClick={onPick} />
    <Button look={u ? "filled" : "outlined"} onClick={onPick} />
    <Button variant="primary" onClick={onPick}>
      Go
    </Button>
    <Select options={[]} />
    <DataTable columns={[]} data={[]} />
    <Checkbox checked />
    <input type="text" aria-label="name" />
    <Badge variant="primary" shape="rounded">
      Draft
    </Badge>
    <Avatar size="small" user={u} />
  </div>
);
