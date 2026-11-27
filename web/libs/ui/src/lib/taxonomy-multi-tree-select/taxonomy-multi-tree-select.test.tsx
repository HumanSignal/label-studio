import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { TaxonomyMultiTreeSelect } from "./taxonomy-multi-tree-select";

beforeEach(() => {
  spyOn(transitionUtils, "aroundTransition").mockImplementation((_element, callbacks) => {
    callbacks.beforeTransition?.();
    callbacks.transition?.();
    callbacks.afterTransition?.();
  });
});

describe("TaxonomyMultiTreeSelect", () => {
  it("keeps labeling taxonomy selections immediate without an Apply footer", async () => {
    const onChange = mock();
    render(
      <TaxonomyMultiTreeSelect
        options={[{ value: "animal", label: "Animal" }]}
        value={[]}
        onChange={onChange}
        controlId="taxonomy"
      />,
    );

    fireEvent.click(screen.getByTestId("taxonomy-taxonomy"));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Animal" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith([{ code: "animal", label: "Animal" }]);
    expect(screen.queryByTestId("multi-tree-select-apply")).not.toBeInTheDocument();
  });
});
