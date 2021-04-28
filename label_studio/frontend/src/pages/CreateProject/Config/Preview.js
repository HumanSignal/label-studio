import { useEffect, useRef } from 'react';
import { Spinner } from '../../../components';
import { useLibrary } from '../../../providers/LibraryProvider';
import { cn } from '../../../utils/bem';
import './Config.styl';
import { EMPTY_CONFIG } from './Template';

const configClass = cn("configure");

export const Preview = ({ config, data, error }) => {
  const LabelStudio = useLibrary('lsf');
  const lsfRoot = useRef();
  const lsf = useRef();

  useEffect(() => {
    if (!LabelStudio) return;
    if (!lsfRoot.current) return;
    if (error) return;
    if (!data) return;

    const LSF = window.LabelStudio;
    try {
      lsf.current?.destroy();
      lsf.current = new LSF(lsfRoot.current, {
        config: config || EMPTY_CONFIG, // empty string causes error in LSF
        interfaces: [
          "side-column",
        ],
        task: {
          annotations: [],
          predictions: [],
          id: 1,
          data,
        },
        onLabelStudioLoad: function(LS) {
          LS.settings.bottomSidePanel = true;
          var c = LS.annotationStore.addAnnotation({
            userGenerate: true,
          });
          LS.annotationStore.selectAnnotation(c.id);
        },
      });
    } catch(e) {
      console.error(e);
    }
  }, [config, data, LabelStudio, lsfRoot]);

  return (
    <div className={configClass.elem("preview")}>
      <h3>UI Preview</h3>
      {error && <div className={configClass.elem("preview-error")}>
        <h2>{error.detail} {error.id}</h2>
        {error.validation_errors?.non_field_errors?.map?.(err => <p key={err}>{err}</p>)}
        {error.validation_errors?.label_config?.map?.(err => <p key={err}>{err}</p>)}
        {error.validation_errors?.map?.(err => <p key={err}>{err}</p>)}
      </div>}
      {!data && <Spinner style={{ width: "100%", height: "50vh" }} />}
      <div id="label-studio" ref={lsfRoot}></div>
      {/* <iframe srcDoc={page} frameBorder="0"></iframe> */}
    </div>
  );
};
