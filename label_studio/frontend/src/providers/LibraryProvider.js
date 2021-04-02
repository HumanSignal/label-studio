import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const libraryQueue = new Map;

const libRequest = new Map;

const requestLabelStudio = (libraries) => async (library) => {
  const {scriptSrc, cssSrc, checkAvailability} = libraries[library];
  const availableLibrary = checkAvailability();

  const queueSet = libraryQueue.get(library) ?? new Set();
  libraryQueue.set(library, queueSet);

  if (availableLibrary) return availableLibrary;

  const requestResolver = new Promise((resolve) => {
    queueSet.add(() => {
      setTimeout(() => {
        resolve(checkAvailability());
      }, 10);
    });
  });

  if (!libRequest.has(library)) {
    libRequest.set(library, (async () => {
      const assets = [];

      if (scriptSrc) {
        assets.push(new Promise((resolve) => {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.onload = () => {
            resolve();
          };
          script.src = scriptSrc;
          script.dataset.replaced = true;
          document.head.appendChild(script);
        }));
      }

      if (cssSrc) {
        assets.push(new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = "stylesheet";
          link.type = "text/css";
          link.onload = () => {
            resolve();
          };
          link.href = cssSrc;
          link.dataset.replaced = true;
          document.head.appendChild(link);
        }));
      }

      await Promise.all(assets);

      queueSet.forEach(resolver => resolver());
    })());
  }

  return requestResolver;
};

export const LibraryContext = createContext({});

export const LibraryProvider = ({libraries, children}) => {
  const requestLibrary = useMemo(() => {
    console.log({libraries});
    return requestLabelStudio(libraries);
  }, [libraries]);

  return (
    <LibraryContext.Provider value={{ requestLibrary }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (libraryName) => {
  const ctx = useContext(LibraryContext);
  const [library, setLibrary] = useState();

  const fetchLibrary = useCallback(async () => {
    const libLoaded = await ctx.requestLibrary(libraryName);

    console.log({libraryName, libLoaded});
    setLibrary(!!libLoaded);
  }, [ctx, libraryName]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  return library;
};
