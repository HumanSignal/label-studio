import { format } from 'date-fns';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { useAPI } from "../../providers/ApiProvider";
import { Block, Elem } from '../../utils/bem';
import './VersionNotifier.styl';
import { IconBell } from '../../assets/icons';

const VersionContext = createContext();

export const VersionProvider = ({children}) => {
  const api = useAPI();

  const [state, dispatch] = useReducer((state, action) => {
    if (action.type === 'fetch-version') {
      return {...state, ...action.payload};
    }
  });

  const fetchVersion = useCallback(async () => {
    const response = await api.callApi("version");
    const data = response.package;

    dispatch({
      type: "fetch-version",
      payload: {
        version: data.version,
        latestVersion: data.latest_version_from_pypi,
        newVersion: data.current_version_is_outdated,
        updateTime: format(new Date(data.latest_version_upload_time), 'MMM d'),
      },
    });
  }, [api]);

  useEffect(() => {
    fetchVersion();
  }, []);

  return (
    <VersionContext.Provider value={state}>
      {children}
    </VersionContext.Provider>
  );
};

export const VersionNotifier = ({showNewVersion, showCurrentVersion}) => {
  const url = "https://pypi.org/project/label-studio/#history";
  const {newVersion, updateTime, latestVersion, version } = useContext(VersionContext) ?? {};

  return (newVersion && showNewVersion) ? (
    <Block tag="li" name="version-notifier">
      <a href={url} target="_blank">
        <Elem name="icon">
          <IconBell/>
        </Elem>
        <Elem name="content">
          <Elem name="title" data-date={updateTime}>
            {latestVersion} Available
          </Elem>
          <Elem name="description">
            Current version: {version}
          </Elem>
        </Elem>
      </a>
    </Block>
  ) : (version && showCurrentVersion) ? (
    <Block tag={Link} name="current-version" to="/version" target="_blank">v{ version }</Block>
  ) : null;
};
