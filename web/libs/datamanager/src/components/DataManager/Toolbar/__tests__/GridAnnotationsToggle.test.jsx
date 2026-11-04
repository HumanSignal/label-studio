import { render, fireEvent, screen } from "@testing-library/react";
import { observable, action } from "mobx";
import { Provider } from "mobx-react";
import { GridAnnotationsToggle } from "../GridAnnotationsToggle";

it("toggles annotation visibility without changing the shared view", () => {
  const store = observable({
    SDK: { type: "dm" },
    currentView: { type: "grid", fieldsAsColumns: [{ type: "Image" }], isLockedByManager: true },
    gridShowAnnotations: false,
    toggleGridAnnotations: action(() => {
      store.gridShowAnnotations = !store.gridShowAnnotations;
    }),
  });
  render(
    <Provider store={store}>
      <GridAnnotationsToggle />
    </Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show annotations" }));
  expect(screen.getByRole("button", { name: "Hide annotations" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Hide annotations" }));
  expect(store.gridShowAnnotations).toBe(false);
  expect(store.currentView.isLockedByManager).toBe(true);
});
