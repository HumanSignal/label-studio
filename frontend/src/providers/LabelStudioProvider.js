import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const queueSet = new Set;

let lsfRequest;

const requestLabelStudio = () => async () => {
  if (window.LabelStudio) {
    return window.LabelStudio;
  }

  const requestResolver = new Promise((resolve) => {
    queueSet.add(() => {
      resolve(window.LabelStudio);
    });
  });

  lsfRequest = lsfRequest ?? (async () => {
    const loadScript = new Promise((resolve) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.onload = () => {
        resolve();
      };
      script.src = window.EDITOR_JS;
      script.dataset.replaced = true;
      document.head.appendChild(script);
    });

    const loadStylesheet = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = "stylesheet";
      link.type = "text/css";
      link.onload = () => {
        resolve();
      };
      link.href = window.EDITOR_CSS;
      link.dataset.replaced = true;
      document.head.appendChild(link);
    });

    await Promise.all([loadScript, loadStylesheet]);

    queueSet.forEach(resolver => resolver());
  })();

  return requestResolver;
};

export const LabelStudioContext = createContext({});

export const LabelStudioProvider = ({children}) => {
  const requestLSF = useMemo(() => {
    return requestLabelStudio();
  }, []);

  return (
    <LabelStudioContext.Provider value={{ requestLSF }}>
      {children}
    </LabelStudioContext.Provider>
  );
};

export const useLabelStudio = () => {
  const ctx = useContext(LabelStudioContext);
  const [lsf, setLSF] = useState();

  useEffect(() => {
    ctx.requestLSF().then(() => {
      setLSF(!!window.LabelStudio);
    });
  }, [ctx]);

  return lsf;
};
