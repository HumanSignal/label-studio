/**
 * Tests for the renderEditor Jest harness and example of DOM/serialization tests
 * that can replace equivalent Cypress tests (e.g. outliner region count, serialization shape).
 * See E2E_TO_CYPRESS_AUDIT.md for migration list.
 *
 * Excluded from editor unit run via jest.config.js testPathIgnorePatterns until the
 * full-app Jest environment is ready (MST model load order). Run via Cypress or a
 * dedicated integration setup in the meantime.
 */
import { renderEditor } from "../renderEditor";

describe("renderEditor", () => {
  it("exports renderEditor as an async function", () => {
    expect(typeof renderEditor).toBe("function");
    expect(renderEditor.constructor.name).toBe("AsyncFunction");
  });

  it("renders editor with config and task and returns store and serialize", async () => {
    const { getByText, serialize, unmount } = await renderEditor({
      config: `<View>
        <Text name="text" value="$text"/>
        <Choices name="choice" toName="text">
          <Choice value="A"/>
          <Choice value="B"/>
        </Choices>
      </View>`,
      task: {
        id: 1,
        data: { text: "Hello" },
        annotations: [{ id: 1, result: [] }],
      },
    });

    expect(getByText("Hello")).toBeInTheDocument();
    const result = serialize();
    expect(result).toBeDefined();
    unmount();
  }, 15000);

  it("serializes annotation result with pre-filled regions", async () => {
    const { serialize, unmount } = await renderEditor({
      config: `<View>
        <Labels name="lbl" toName="text">
          <Label value="Label1"/>
        </Labels>
        <Text name="text" value="$text"/>
      </View>`,
      task: {
        id: 1,
        data: { text: "Example" },
        annotations: [
          {
            id: 1,
            result: [
              {
                value: { start: 0, end: 7, text: "Example", labels: ["Label1"] },
                id: "r1",
                from_name: "lbl",
                to_name: "text",
                type: "labels",
                origin: "manual",
              },
            ],
          },
        ],
      },
    });

    const result = serialize();
    expect(result).toHaveLength(1);
    expect(result?.[0].value.labels).toContain("Label1");
    unmount();
  }, 15000);
});
