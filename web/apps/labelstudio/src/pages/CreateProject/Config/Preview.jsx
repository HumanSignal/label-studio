import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "../../../components";
import { cn } from "../../../utils/bem";
import { FF_DEV_3617, isFF } from "../../../utils/feature-flags";
import "./Config.scss";
import { EMPTY_CONFIG } from "./Template";
import { API_CONFIG } from "../../../config/ApiConfig";
import { useAPI } from "../../../providers/ApiProvider";

const configClass = cn("configure");

const loadDependencies = async () => import("@humansignal/editor");

export const Preview = ({ config, data, error, loading, project }) => {
  const lsf = useRef(null);
  const resolvingEditor = useMemo(loadDependencies);
  const rootRef = useRef();
  const projectRef = useRef(project);
  const api = useAPI();

  projectRef.current = project;

  const currentTask = useMemo(() => {
    return {
      id: 1,
      annotations: [],
      predictions: [],
      data,
    };
  }, [data]);

  /**
   * Proxy urls to presign them if storage is connected
   * @param {*} _ LS instance
   * @param {string} url http/https are not proxied and returned as is
   */
  const onPresignUrlForProject = async (_, url) => {
    const parsedUrl = new URL(url);

    // return same url if http(s)
    if (["http:", "https:"].includes(parsedUrl.protocol)) return url;

    const projectId = projectRef.current.id;

    const fileuri = btoa(url);

    return api.api.createUrl(API_CONFIG.endpoints.presignUrlForProject, { projectId, fileuri }).url;
  };

  const currentConfig = useMemo(() => {
    // empty string causes error in LSF
    return config ?? EMPTY_CONFIG;
  }, [config]);

  const initLabelStudio = useCallback(async (config, task) => {
    if (!task.data) return;

    await resolvingEditor;

    try {
      const lsf = new window.LabelStudio(rootRef.current, {
        config,
        task,
        interfaces: ["side-column"],
        // with SharedStore we should use more late event
        [isFF(FF_DEV_3617) ? "onStorageInitialized" : "onLabelStudioLoad"](LS) {
          LS.settings.bottomSidePanel = true;

          const initAnnotation = () => {
            const as = LS.annotationStore;
            const c = as.createAnnotation();

            as.selectAnnotation(c.id);
          };

          if (isFF(FF_DEV_3617)) {
            // and even then we need to wait a little even after the store is initialized
            setTimeout(initAnnotation);
          } else {
            initAnnotation();
          }
        },
      });

      lsf.on("presignUrlForProject", onPresignUrlForProject);

      return lsf;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  useEffect(() => {
    const opacity = loading || error ? 0.6 : 1;
    // to avoid rerenders and data loss we do it this way

    document.getElementById("label-studio").style.opacity = opacity;
  }, [loading, error]);

  useEffect(() => {
    if (!lsf.current) {
      initLabelStudio(currentConfig, currentTask).then((ls) => {
        lsf.current = ls;
      });
    }
  }, [currentConfig, currentTask]);

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

  useEffect(() => {
    return () => {
      if (lsf.current) {
        console.info("Destroying LSF");
        // there can be weird error from LSF, but we can just skip it for now
        try {
          lsf.current.destroy();
        } catch (e) {}
        lsf.current = null;
      }
    };
  }, []);

  return (
    <div className={configClass.elem("preview")}>
      <h3>UI Preview</h3>
      {error && (
        <div className={configClass.elem("preview-error")}>
          <h2>
            {error.detail} {error.id}
          </h2>
          {error.validation_errors?.non_field_errors?.map?.((err) => (
            <p key={err}>{err}</p>
          ))}
          {error.validation_errors?.label_config?.map?.((err) => (
            <p key={err}>{err}</p>
          ))}
          {error.validation_errors?.map?.((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}
      {!data && loading && <Spinner style={{ width: "100%", height: "50vh" }} />}
      <div id="label-studio" className={configClass.elem("preview-ui")} ref={rootRef} />
    </div>
  );
};
