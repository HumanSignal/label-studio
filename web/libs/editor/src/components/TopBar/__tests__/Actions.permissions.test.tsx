import { render, screen } from "@testing-library/react";
import { Actions } from "../Actions";

test.each([
  [false, 1, false, false, true],
  [false, 2, false, false, false],
  [false, null, false, false, false],
  [true, 2, false, false, true],
  [true, 2, true, false, false],
  [false, 1, true, false, true],
  [false, 1, false, true, false],
])("toolbar delete respects ownership (manager=%j, owner=%j, draft=%j, viewAll=%j)", (manager, owner, draft, viewAll, allowed) => {
  const entity = {
    id: "editor-id",
    pk: draft ? null : "41",
    type: "annotation",
    user: owner ? { id: owner } : null,
    userGenerate: draft,
    sentUserGenerate: false,
    draftId: draft ? 12 : 0,
    editable: true,
  };
  const store = {
    user: { id: 1 },
    annotationStore: { selected: entity, viewingAll: viewAll },
    hasInterface: (name: string) => name === "annotations:delete" || (!manager && name === "annotations:delete-own"),
  };

  render(<Actions store={store} />);

  expect(screen.queryByRole("button", { name: "Delete", exact: true }) !== null).toBe(allowed);
});
