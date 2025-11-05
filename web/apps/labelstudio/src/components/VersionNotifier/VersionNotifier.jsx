import { format } from "date-fns";
import { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import { Link } from "react-router-dom";
import { useAPI } from "../../providers/ApiProvider";
import { cn } from "../../utils/bem";
import "./VersionNotifier.scss";
import { IconBell } from "@humansignal/icons";

const VersionContext = createContext();

export const VersionProvider = ({ children }) => {
  const api = useAPI();

  const [state, dispatch] = useReducer((state, action) => {
    if (action.type === "fetch-version") {
      return { ...state, ...action.payload };
    }
  });

  const fetchVersion = useCallback(async () => {
    const response = await api.callApi("version");

    if (response !== null) {
      const data = response["label-studio-os-package"];

      dispatch({
        type: "fetch-version",
        payload: {
          version: data.version,
          latestVersion: data.latest_version_from_pypi,
          newVersion: data.current_version_is_outdated,
          updateTime: format(new Date(data.latest_version_upload_time), "MMM d"),
        },
      });
    }
  }, []);

  useEffect(() => {
    fetchVersion();
  }, []);

  return <VersionContext.Provider value={state}>{children}</VersionContext.Provider>;
};

export const VersionNotifier = ({ showNewVersion, showCurrentVersion }) => {
  const { newVersion, updateTime, latestVersion, version } = useContext(VersionContext) ?? {};
  const url = `https://labelstud.io/redirect/update?version=${version}`;

  return newVersion && showNewVersion ? (
    <li className={cn("version-notifier").toClassName()}>
      <a href={url} target="_blank" rel="noreferrer">
        <div className={cn("version-notifier").elem("icon").toClassName()}>
          <IconBell />
        </div>
        <div className={cn("version-notifier").elem("content").toClassName()}>
          <div className={cn("version-notifier").elem("title").toClassName()} data-date={updateTime}>
            {latestVersion} Available
          </div>
          <div className={cn("version-notifier").elem("description").toClassName()}>Current version: {version}</div>
        </div>
      </a>
    </li>
  ) : version && showCurrentVersion ? (
    <Link className={cn("current-version").toClassName()} to="/version" target="_blank">
      v{version}
    </Link>
  ) : null;
};
