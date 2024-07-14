import { inject, observer } from "mobx-react";

import { IconCheck, IconCross } from "../../assets/icons";
import { Button } from "../../common/Button/Button";
import { Block, Elem } from "../../utils/bem";
import { Space } from "../../common/Space/Space";
import Toggle from "../../common/Toggle/Toggle";

import "./AutoAcceptToggle.styl";

// we need to inject all of them to trigger rerender on changes to suggestions
const injector = inject(({ store }) => {
  const annotation = store.annotationStore?.selected;
  const suggestions = annotation?.suggestions;

  return {
    store,
    annotation,
    suggestions,
  };
});

export const AutoAcceptToggle = injector(
  observer(({ store, annotation, suggestions }) => {
    if (!store.autoAnnotation) return null;

    const withSuggestions = annotation.hasSuggestionsSupport && !store.forceAutoAcceptSuggestions;
    const loading = store.awaitingSuggestions;

    return (
      <Block name="auto-accept">
        {withSuggestions && (
          <Elem name="wrapper" mod={{ loading }}>
            <Space spread>
              {suggestions.size > 0 ? (
                <Space size="small">
                  <Elem name="info">
                    {suggestions.size} suggestion{suggestions.size > 0 && "s"}
                  </Elem>
                  <Elem
                    name="action"
                    tag={Button}
                    mod={{ type: "reject" }}
                    onClick={() => annotation.rejectAllSuggestions()}
                  >
                    <IconCross />
                  </Elem>
                  <Elem
                    name="action"
                    tag={Button}
                    mod={{ type: "accept" }}
                    onClick={() => annotation.acceptAllSuggestions()}
                  >
                    <IconCheck />
                  </Elem>
                </Space>
              ) : (
                <Toggle
                  checked={store.autoAcceptSuggestions}
                  onChange={(e) => store.setAutoAcceptSuggestions(e.target.checked)}
                  label="Auto-Accept Suggestions"
                  style={{ color: "#7F64FF" }}
                />
              )}
            </Space>
          </Elem>
        )}
        {loading && <Elem name="spinner" />}
      </Block>
    );
  }),
);
