import { useEffect, useState } from 'react';
import { Spinner } from '../../../components';
import { useLibrary } from '../../../providers/LibraryProvider';
import { cn } from '../../../utils/bem';
import './Config.styl';
import { EMPTY_CONFIG } from './Template';

const configClass = cn("configure");

export const Preview = ({ config, data, error }) => {
  const [page, setPage] = useState("");
  const LabelStudio = useLibrary('lsf');

  useEffect(() => {
    if (!LabelStudio) return;
    if (error) return;
    if (!data) return;
    const inPlace = true;

    if (inPlace) {
      const LSF = window.LabelStudio;
      try {
        new LSF('label-studio', {
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
    } else {
      const page = `
        <div id="ls"></div>
        <script>
        const LSF = window.parent.LabelStudio;
        new LSF('ls', {
          config: '<View><Image value="$image" /></View>',
          interfaces: [
            "panel",
            "controls",
            "side-column",
          ],
          task: {
            annotations: [],
            predictions: [],
            id: 1,
            data: {
              image: "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
            }
          },
          onLabelStudioLoad: function(LS) {
            var c = LS.annotationStore.addAnnotation({
              userGenerate: true
            });
            LS.annotationStore.selectAnnotation(c.id);
          }
        });
        </script>
        `;
      setPage(page);
    }
  }, [config, data, LabelStudio]);

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
      <div id="label-studio"></div>
      {/* <iframe srcDoc={page} frameBorder="0"></iframe> */}
    </div>
  );
};
