import { inject } from "mobx-react";
import clsx from "clsx";
import { useMemo, useRef } from "react";
import { useSDK } from "../../../providers/SDKProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Space } from "../../Common/Space/Space";
import { IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { Tooltip, Userpic } from "@humansignal/ui";
import { Common } from "../../Filters/types";
import { useAvatarOverflow } from "../../../hooks/useAvatarOverflow";
import "./Annotators.prefix.css";
import { UserSelect } from "../../Common/UserSelect";

export const Annotators = (cell) => {
  const { value, column, original: task } = cell;
  const sdk = useSDK();
  const containerRef = useRef(null);

  // Use dynamic avatar overflow calculation based on container width
  const visibleAvatarCount = useAvatarOverflow({
    enabled: true,
    containerRef,
    itemCount: value.length,
  });

  // Fall back to max_users_to_display for backward compatibility if needed
  const maxUsersToDisplay = window.APP_SETTINGS.data_manager?.max_users_to_display ?? 0;
  const effectiveVisibleCount = visibleAvatarCount ?? (maxUsersToDisplay > 0 ? maxUsersToDisplay : value.length);
  const userList = Array.from(value).slice(0, effectiveVisibleCount);

  const userPickBadge = cn("userpic-badge");
  const annotatorsCN = cn("annotators");
  const isEnterprise = window.APP_SETTINGS.billing?.enterprise;

  // Memoize the count field calculation
  const extraCount = useMemo(() => {
    const getCountField = () => {
      switch (column.alias) {
        case "annotators":
          return task?.annotators_count || 0;
        case "reviewers":
          return task?.reviewers_count || 0;
        case "comment_authors":
          return task?.comment_authors_count || 0;
        default:
          return 0;
      }
    };

    return getCountField() - effectiveVisibleCount;
  }, [column.alias, task?.annotators_count, task?.reviewers_count, task?.comment_authors_count, effectiveVisibleCount]);

  return (
    <div ref={containerRef} className={annotatorsCN.toClassName()}>
      {userList.map((item, index) => {
        const user = item.user ?? item;
        const { annotated, reviewed, review } = item;

        const userpicIsFaded =
          (isDefined(annotated) && annotated === false) || (isDefined(reviewed) && reviewed === false && isEnterprise);
        const suppressStats = column.alias === "comment_authors";

        return (
          <div
            key={`user-${user.id}-${index}`}
            className={annotatorsCN.elem("item").toClassName()}
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
                    <div
                      className={clsx(userPickBadge.toClassName(), userPickBadge.mod({ [review]: true }).toClassName())}
                    >
                      {review === "rejected" ? <IconCrossAlt /> : <IconCheckAlt />}
                    </div>
                  ),
                }}
              />
            </Tooltip>
          </div>
        );
      })}
      {extraCount > 0 && (
        <div
          className={annotatorsCN.elem("item").toClassName()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sdk.invoke("userCellCounterClick", e, column.alias, task, userList);
          }}
        >
          <Userpic addCount={`+${extraCount}`} />
        </div>
      )}
    </div>
  );
};

const UsersInjector = inject(({ store }) => {
  return {
    users: store.users,
  };
});

Annotators.filterItems = (items) => {
  return items.filter((userId) => {
    const user = DM.usersMap.get(userId);
    return !(user?.firstName === "Deleted" && user?.lastName === "User");
  });
};

Annotators.FilterItem = UsersInjector(({ item }) => {
  const user = DM.usersMap.get(item);

  return user ? (
    <Space size="small">
      <Userpic user={user} size={16} key={`user-${item}`} />
      {user.displayName}
    </Space>
  ) : null;
});

Annotators.searchFilter = (option, queryString) => {
  const user = DM.usersMap.get(option?.value);
  if (!user) {
    // Fallback to searching by ID if user not found
    return option?.value?.toString().toLowerCase().includes(queryString.toLowerCase());
  }

  return (
    user.id?.toString().toLowerCase().includes(queryString.toLowerCase()) ||
    user.email.toLowerCase().includes(queryString.toLowerCase()) ||
    user.displayName.toLowerCase().includes(queryString.toLowerCase())
  );
};

Annotators.filterable = true;
Annotators.customOperators = [
  {
    key: "contains",
    label: "contains",
    valueType: "list",
    input: (props) => <UserSelect {...props} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => <UserSelect {...props} />,
  },
  ...Common,
];
