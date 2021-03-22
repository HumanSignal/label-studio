import { useCallback, useMemo, useState } from "react";
import { Block } from "../../utils/bem";
import { PeopleList } from "./PeopleList";
import "./PeoplePage.styl";
import { SelectedUser } from "./SelectedUser";

export const PeoplePage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const selectUser = useCallback((user) => {
    console.log({user});
    setSelectedUser(user);

    localStorage.setItem('selectedUser', user?.id);
  }, [setSelectedUser]);

  const defaultSelected = useMemo(() => {
    return localStorage.getItem('selectedUser');
  }, []);

  return (
    <Block name="people">
      <PeopleList
        selectedUser={selectedUser}
        defaultSelected={defaultSelected}
        onSelect={(user) => selectUser(user)}
      />

      {selectedUser && (
        <SelectedUser
          user={selectedUser}
          onClose={() => selectUser(null)}
        />
      )}
    </Block>
  );
};

PeoplePage.title = "People";
PeoplePage.path = "/people";
