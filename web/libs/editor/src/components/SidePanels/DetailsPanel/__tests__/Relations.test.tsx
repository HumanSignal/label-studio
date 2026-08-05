import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Relations } from "../Relations";

jest.mock("mobx-react", () => ({
  observer: (component: any) => component,
}));

jest.mock("@humansignal/icons", () => ({
  IconEyeClosed: () => <span data-testid="icon-eye-closed" />,
  IconEyeOpened: () => <span data-testid="icon-eye-opened" />,
  IconMenu: () => <span data-testid="icon-menu" />,
  IconRelationBi: () => <span data-testid="icon-relation-bi" />,
  IconRelationLeft: () => <span data-testid="icon-relation-left" />,
  IconRelationRight: () => <span data-testid="icon-relation-right" />,
  IconTrash: () => <span data-testid="icon-trash" />,
}));

jest.mock("@humansignal/ui", () => ({
  Button: ({ children, onClick, primary, type, ...props }: any) => (
    <button type="button" data-primary={primary ? "true" : "false"} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Select: ({ onChange, options = [], value, multiple, placeholder }: any) => (
    <select
      aria-label={placeholder}
      multiple={multiple}
      value={multiple ? value : (value?.[0] ?? "")}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="" />
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("../RegionItem", () => ({
  RegionItem: ({ region }: any) => <div data-testid="region-item">{region.id}</div>,
}));

const makeRelation = (overrides: any = {}) => ({
  id: "relation-1",
  direction: "right",
  visible: true,
  showMeta: true,
  hasRelations: true,
  note: "Existing note",
  selectedValues: ["supports"],
  control: {
    choice: "single",
    children: [{ value: "supports", background: "#fff" }],
  },
  node1: { id: "region-1", setHighlight: jest.fn(), toggleHighlight: jest.fn() },
  node2: { id: "region-2", setHighlight: jest.fn(), toggleHighlight: jest.fn() },
  parent: { deleteRelation: jest.fn() },
  rotateDirection: jest.fn(),
  toggleMeta: jest.fn(),
  toggleVisibility: jest.fn(),
  toggleHighlight: jest.fn(),
  setSelfHighlight: jest.fn(),
  setRelations: jest.fn(),
  setNote: jest.fn(),
  ...overrides,
});

describe("Relations", () => {
  beforeAll(() => {
    Object.defineProperty(global, "ResizeObserver", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      })),
    });
  });

  it("renders and updates a relation note", () => {
    const relation = makeRelation();

    render(<Relations relationStore={{ orderedRelations: [relation] }} />);

    const note = screen.getByLabelText("Relation note");

    expect(note).toHaveValue("Existing note");

    fireEvent.input(note, { target: { value: "Updated relationship note" } });

    expect(relation.setNote).toHaveBeenCalledWith("Updated relationship note");
  });

  it("shows relation details even without configured relation labels", () => {
    const relation = makeRelation({
      hasRelations: false,
      selectedValues: [],
      control: { children: [] },
    });

    render(<Relations relationStore={{ orderedRelations: [relation] }} />);

    expect(screen.queryByLabelText("Select labels")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Relation note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Relation Details" })).toBeInTheDocument();
  });
});
