import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Spinner } from '../../../components';
import { useLibrary } from '../../../providers/LibraryProvider';
import { cn } from '../../../utils/bem';
import './Config.styl';
import { EMPTY_CONFIG } from './Template';

const configClass = cn("configure");

export const Preview = ({ config, data, error, loading }) => {
  const LabelStudio = useLibrary('lsf');
  const lsf = useRef(null);
  const rootRef = useRef();

  const currentTask = useMemo(() => {
    return {
      id: 1,
      annotations: [],
      predictions: [],
      data,
    };
  }, [data]);

  const currentConfig = useMemo(() => {
    // empty string causes error in LSF
    return config ?? EMPTY_CONFIG;
  }, [config]);

  const initLabelStudio = useCallback((config, task) => {
    if (!LabelStudio) return;
    if (!task.data) return;

    console.info("Initializing LSF preview", { config, task });

    try {
      return new window.LabelStudio(rootRef.current, {
        config,
        task,
        interfaces: ["side-column"],
        onLabelStudioLoad(LS) {
          LS.settings.bottomSidePanel = true;

          const as = LS.annotationStore;
          const c = as.createAnnotation();

          as.selectAnnotation(c.id);
        },
      });
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [LabelStudio]);

  useEffect(() => {
    const opacity = loading || error ? 0.6 : 1;
    // to avoid rerenders and data loss we do it this way

    document.getElementById("label-studio").style.opacity = opacity;
  }, [loading, error]);

  useEffect(() => {
    if (!lsf.current) {
      lsf.current = initLabelStudio(currentConfig, currentTask);
    }

    return () => {
      if (lsf.current) {
        console.info('Destroying LSF');
        // there is can be weird error from LSF, but we can just skip it for now
        try {
          lsf.current.destroy();
        } catch(e) {}
        lsf.current = null;
      }
    };
  }, [initLabelStudio, currentConfig, currentTask]);

  useEffect(() => {
    if (lsf.current?.store) {
      lsf.current.store.assignConfig(currentConfig);
      console.log("LSF config updated");
    }
  }, [currentConfig]);

  useEffect(() => {
    if (lsf.current?.store) {
      const store = lsf.current.store;

      store.resetState();
      store.assignTask(currentTask);
      store.initializeStore(currentTask);

      const c = store.annotationStore.addAnnotation({
        userGenerate: true,
      });

      store.annotationStore.selectAnnotation(c.id);
      console.log("LSF task updated");
    }
  }, [currentTask]);

  return (
    <div className={configClass.elem("preview")}>
      <h3>UI Preview</h3>
      {error && (
        <div className={configClass.elem("preview-error")}>
          <h2>{error.detail} {error.id}</h2>
          {error.validation_errors?.non_field_errors?.map?.(err => <p key={err}>{err}</p>)}
          {error.validation_errors?.label_config?.map?.(err => <p key={err}>{err}</p>)}
          {error.validation_errors?.map?.(err => <p key={err}>{err}</p>)}
        </div>
      )}
      {!data && loading && <Spinner style={{ width: "100%", height: "50vh" }} />}
      <div id="label-studio" className={configClass.elem("preview-ui")} ref={rootRef}></div>
    </div>
  );
};
