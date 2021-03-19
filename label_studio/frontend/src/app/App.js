import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../providers/ApiProvider';
import { AppStoreProvider } from '../providers/AppStoreProvider';
import { ConfigProvider } from '../providers/ConfigProvider';
import { LibraryProvider } from '../providers/LibraryProvider';
import { MultiProvider } from '../providers/MultiProvider';
import { ProjectProvider } from '../providers/ProjectProvider';
import { RoutesProvider } from '../providers/RoutesProvider';
import './App.styl';
import { AsyncPage } from './AsyncPage/AsyncPage';
import ErrorBoundary from './ErrorBoundary';
import { RootPage } from './RootPage';

const App = ({content}) => {
  const url = new URL(APP_SETTINGS.hostname || location.origin);

  const libraries = {
    lsf: {
      scriptSrc: window.EDITOR_JS,
      cssSrc: window.EDITOR_CSS,
      checkAvailability: () => !!window.LabelStudio,
    },
    dm: {
      scriptSrc: window.DM_JS,
      cssSrc: window.DM_CSS,
      checkAvailability: () => !!window.DataManager,
    },
  };

  return (
    <ErrorBoundary>
      <BrowserRouter basename={url.pathname || undefined}>
        <MultiProvider providers={[
          <AppStoreProvider key="app-store"/>,
          <ApiProvider key="api"/>,
          <ConfigProvider key="config"/>,
          <LibraryProvider key="lsf" libraries={libraries}/>,
          <RoutesProvider key="rotes"/>,
          <ProjectProvider key="project"/>,
        ]}>
          <AsyncPage>
            <RootPage content={content}/>
          </AsyncPage>
        </MultiProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const root = document.querySelector('.app-wrapper');
const content = document.querySelector('#main-content');

render(<App content={content.innerHTML}/>, root);
