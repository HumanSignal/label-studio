import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAPI } from "./ApiProvider";
import { useAppStore } from "./AppStoreProvider";

const CurrentUserContext = createContext();

export const CurrentUserProvider = ({ children }) => {
    const api = useAPI();
    const [user, setUser] = useState();
    const { update: updateStore } = useAppStore();

    const fetch = useCallback(() => {
        api.callApi("me").then((user) => {
            setUser(user);
            updateStore({ userInfo: user });
        });
    }, [api.callApi]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return <CurrentUserContext.Provider value={{ user, fetch }}>{children}</CurrentUserContext.Provider>;
};

export const useCurrentUser = () => useContext(CurrentUserContext) ?? {};
