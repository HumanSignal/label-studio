/**
 * Repeater (no pagination) for Codecov: core/Tree.tsx repeater branch.
 */
export const repeaterConfig = `
<View>
  <Repeater on="$items" indexFlag="{{idx}}">
    <View>
      <Text name="item_{{idx}}" value="$items[{{idx}}].label" />
    </View>
    <View>
      <Choices name="choice_{{idx}}" toName="item_{{idx}}" showInline="true">
        <Choice value="A" />
        <Choice value="B" />
      </Choices>
    </View>
  </Repeater>
</View>
`;

/**
 * Repeater with mode="pagination" (PagedView) for Codecov: tags/object/PagedView.jsx, common/Pagination.
 */
export const repeaterPagedConfig = `
<View>
  <Repeater on="$items" indexFlag="{{idx}}" mode="pagination">
    <View>
      <Text name="item_{{idx}}" value="$items[{{idx}}].label" />
    </View>
    <View>
      <Choices name="choice_{{idx}}" toName="item_{{idx}}" showInline="true">
        <Choice value="A" />
        <Choice value="B" />
      </Choices>
    </View>
  </Repeater>
</View>
`;

export const repeaterPagedData = {
  items: [{ label: "Page one text" }, { label: "Page two text" }, { label: "Page three text" }],
};
