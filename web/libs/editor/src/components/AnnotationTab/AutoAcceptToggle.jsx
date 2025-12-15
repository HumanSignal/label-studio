import { inject, observer } from "mobx-react";

import { IconCheck, IconCross } from "@humansignal/icons";
import { Button, Toggle } from "@humansignal/ui";
import { Space } from "../../common/Space/Space";
import { cn } from "../../utils/bem";

import "./AutoAcceptToggle.scss";

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
      <div className={cn("auto-accept").toClassName()}>
        {withSuggestions && (
          <div className={cn("auto-accept").elem("wrapper").mod({ loading }).toClassName()}>
            <Space spread>
              {suggestions.size > 0 ? (
                <Space size="small">
                  <div className={cn("auto-accept").elem("info").toClassName()}>
                    {suggestions.size} suggestion{suggestions.size > 0 && "s"}
                  </div>
                  <Button
                    className={cn("auto-accept").elem("action").mod({ type: "reject" }).toClassName()}
                    onClick={() => annotation.rejectAllSuggestions()}
                    data-testid="bottombar-reject-suggestions-button"
                  >
                    <IconCross />
                  </Button>
                  <Button
                    className={cn("auto-accept").elem("action").mod({ type: "accept" }).toClassName()}
                    onClick={() => annotation.acceptAllSuggestions()}
                    data-testid="bottombar-accept-suggestions-button"
                  >
                    <IconCheck />
                  </Button>
                </Space>
              ) : (
                <Toggle
                  checked={store.autoAcceptSuggestions}
                  onChange={(e) => store.setAutoAcceptSuggestions(e.target.checked)}
                  label="Auto-Accept Suggestions"
                  data-testid="bottombar-auto-accept-toggle"
                />
              )}
            </Space>
          </div>
        )}
        {loading && <div className={cn("auto-accept").elem("spinner").toClassName()} />}
      </div>
    );
  }),
);
