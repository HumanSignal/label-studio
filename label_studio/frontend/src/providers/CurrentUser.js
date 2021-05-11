import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAPI } from "./ApiProvider";

const CurrentUserContext = createContext();

export const CurrentUserProvider = ({children}) => {
  const api = useAPI();
  const [user, setUser] = useState();

  const fetch = useCallback(() => {
    api.callApi('me').then(user => {
      setUser(user);
    });
  }, [api]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <CurrentUserContext.Provider value={{user, fetch}}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => useContext(CurrentUserContext) ?? {};
