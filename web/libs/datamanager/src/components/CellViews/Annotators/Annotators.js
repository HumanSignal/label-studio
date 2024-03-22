import { inject } from "mobx-react";
import { LsCheckAlt, LsCrossAlt } from "../../../assets/icons";
import { useSDK } from "../../../providers/SDKProvider";
import { Block, Elem } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Space } from "../../Common/Space/Space";
import { Tooltip } from "../../Common/Tooltip/Tooltip";
import { Userpic } from "../../Common/Userpic/Userpic";
import { Common } from "../../Filters/types";
import { VariantSelect } from "../../Filters/types/List";
import "./Annotators.styl";

export const Annotators = (cell) => {
  const { value, column, original: task } = cell;
  const sdk = useSDK();
  const userList = Array.from(value);
  const renderable = userList.slice(0, 10);
  const extra = userList.length - renderable.length;

  return (
    <Block name="annotators">
      {renderable.map((item) => {
        const user = item.user ?? item;
        const { annotated, reviewed, review } = item;

        const userpicIsFaded =
          (isDefined(annotated) && annotated === false) || (isDefined(reviewed) && reviewed === false);
        const suppressStats = column.alias === "comment_authors";

        return (
          <Elem
            key={`user-${user.id}`}
            name="item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sdk.invoke("userCellClick", e, column.alias, task, user, suppressStats);
            }}
          >
            <Tooltip title={user.fullName || user.email}>
              <Userpic
                user={user}
                faded={userpicIsFaded}
                badge={{
                  bottomRight: review && (
                    <Block name="userpic-badge" mod={{ [review]: true }}>
                      {review === "rejected" ? <LsCrossAlt /> : <LsCheckAlt />}
                    </Block>
                  ),
                }}
              />
            </Tooltip>
          </Elem>
        );
      })}
      {extra > 0 && (
        <Elem
          name="item"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sdk.invoke("userCellCounterClick", e, column.alias, task, userList);
          }}
        >
          <Userpic username={`+${extra}`} />
        </Elem>
      )}
    </Block>
  );
};

const UsersInjector = inject(({ store }) => {
  return {
    users: store.users,
  };
});

Annotators.FilterItem = UsersInjector(({ users, item }) => {
  const user = users.find((u) => u.id === item);

  return user ? (
    <Space size="small">
      <Userpic user={user} size={16} key={`user-${item}`} />
      {user.displayName}
    </Space>
  ) : null;
});

Annotators.filterable = true;
Annotators.customOperators = [
  {
    key: "contains",
    label: "contains",
    valueType: "list",
    input: (props) => <VariantSelect {...props} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => <VariantSelect {...props} />,
  },
  ...Common,
];
