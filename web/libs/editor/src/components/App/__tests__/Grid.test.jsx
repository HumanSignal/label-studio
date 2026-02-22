import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import Grid from "../Grid";

jest.mock("../../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_DEV_3391: "fflag_dev_3391",
  FF_FIT_720_LAZY_LOAD_ANNOTATIONS: "fflag_fit_720_lazy_load_annotations",
}));

jest.mock("../../AnnotationTabs/AnnotationTabs", () => ({
  EntityTab: ({ entity, onClick }) => (
    <div data-testid="entity-tab" onClick={() => onClick?.()}>
      {entity?.id}
    </div>
  ),
}));

jest.mock("../Annotation", () => ({
  Annotation: () => <div data-testid="annotation-panel">Annotation</div>,
}));

function createStore(overrides = {}) {
  return {
    selected: { selected: null },
    selectAnnotation: jest.fn(),
    selectPrediction: jest.fn(),
    _selectItem: jest.fn(),
    _unselectAll: jest.fn(),
    store: {},
    ...overrides,
  };
}

function createAnnotation(overrides = {}) {
  return {
    id: "ann-1",
    pk: 1,
    type: "annotation",
    hidden: false,
    userGenerate: false,
    ...overrides,
  };
}

describe("Grid", () => {
  it("renders classic Grid (GridClassComponent) when virtualization FF is off", () => {
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
    expect(screen.getAllByTestId("entity-tab")).toHaveLength(2);
  });

  it("filters out hidden annotations", () => {
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2", hidden: true })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getAllByTestId("entity-tab")).toHaveLength(1);
  });
});
