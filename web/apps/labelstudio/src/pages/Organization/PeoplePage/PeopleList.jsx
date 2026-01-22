import { formatDistance } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Userpic } from "@humansignal/ui";
import { Pagination, Spinner } from "../../../components";
import { usePage, usePageSize } from "../../../components/Pagination/Pagination";
import { useAPI } from "../../../providers/ApiProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/helpers";
import "./PeopleList.scss";
import { CopyableTooltip } from "../../../components/CopyableTooltip/CopyableTooltip";

export const PeopleList = ({ onSelect, selectedUser, defaultSelected }) => {
  const api = useAPI();
  const [usersList, setUsersList] = useState();
  const [currentPage] = usePage("page", 1);
  const [currentPageSize] = usePageSize("page_size", 30);
  const [totalItems, setTotalItems] = useState(0);

  const fetchUsers = useCallback(async (page, pageSize) => {
    const response = await api.callApi("memberships", {
      params: {
        pk: 1,
        contributed_to_projects: 1,
        page,
        page_size: pageSize,
      },
    });

    if (response.results) {
      setUsersList(response.results);
      setTotalItems(response.count);
    }
  }, []);

  const selectUser = useCallback(
    (user) => {
      if (selectedUser?.id === user.id) {
        onSelect?.(null);
      } else {
        onSelect?.(user);
      }
    },
    [selectedUser],
  );

  useEffect(() => {
    fetchUsers(currentPage, currentPageSize);
  }, []);

  useEffect(() => {
    if (isDefined(defaultSelected) && usersList) {
      const selected = usersList.find(({ user }) => user.id === Number(defaultSelected));

      if (selected) selectUser(selected.user);
    }
  }, [usersList, defaultSelected]);

  return (
    <>
      <div className={cn("people-list").toClassName()}>
        <div className={cn("people-list").elem("wrapper").toClassName()}>
          {usersList ? (
            <div className={cn("people-list").elem("users").toClassName()}>
              <div className={cn("people-list").elem("header").toClassName()}>
                <div className={cn("people-list").elem("column").mix("avatar").toClassName()} />
                <div className={cn("people-list").elem("column").mix("email").toClassName()}>Email</div>
                <div className={cn("people-list").elem("column").mix("name").toClassName()}>Name</div>
                <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>Last Activity</div>
              </div>
              <div className={cn("people-list").elem("body").toClassName()}>
                {usersList.map(({ user }) => {
                  const active = user.id === selectedUser?.id;

                  return (
                    <div
                      key={`user-${user.id}`}
                      className={cn("people-list").elem("user").mod({ active }).toClassName()}
                      onClick={() => selectUser(user)}
                    >
                      <div className={cn("people-list").elem("field").mix("avatar").toClassName()}>
                        <CopyableTooltip title={`User ID: ${user.id}`} textForCopy={user.id}>
                          <Userpic user={user} style={{ width: 28, height: 28 }} />
                        </CopyableTooltip>
                      </div>
                      <div className={cn("people-list").elem("field").mix("email").toClassName()}>{user.email}</div>
                      <div className={cn("people-list").elem("field").mix("name").toClassName()}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                        {formatDistance(new Date(user.last_activity), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={cn("people-list").elem("loading").toClassName()}>
              <Spinner size={36} />
            </div>
          )}
        </div>
        <Pagination
          page={currentPage}
          urlParamName="page"
          totalItems={totalItems}
          pageSize={currentPageSize}
          pageSizeOptions={[30, 50, 100]}
          onPageLoad={fetchUsers}
          style={{ paddingTop: 16 }}
        />
      </div>
    </>
  );
};
