import { inject, observer } from "mobx-react";
import React from "react";
import { taskToLSFormat } from "../../../sdk/lsf-utils";
import { Block } from "../../../utils/bem";
import { FF_LSDV_4711, isFF } from "../../../utils/feature-flags";
import { Spinner } from "../Spinner";
import "./AnnotationPreview.scss";

const imgDefaultProps = {};

if (isFF(FF_LSDV_4711)) imgDefaultProps.crossOrigin = "anonymous";

const wait = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));

class PreviewGenerator {
  static getInstance(labelingConfig) {
    if (PreviewGenerator._instance) return PreviewGenerator._instance;

    return (PreviewGenerator._instance = new PreviewGenerator(labelingConfig));
  }

  constructor(labelingConfig) {
    this.loaded = false;
    this.running = false;
    this.queue = [];

    this.root = document.querySelector(".offscreen");

    this.lsf = new window.LabelStudio(this.root, {
      user: { id: 1 },
      interfaces: [],
      config: labelingConfig ?? "",
      onLabelStudioLoad: () => {
        this.loaded = true;
        this.startQueue();
      },
    });
  }

  generatePreview(task, annotation) {
    return new Promise((resolve) => {
      this.queue.push({
        task,
        annotation,
        resolve,
      });

      this.startQueue();
    });
  }

  async startQueue() {
    if (this.loaded === false) return;
    if (this.running === true) return;
    if (this.queue.length === 0) return;

    this.running = true;
    await this.processJob();
    this.running = false;
  }

  async processJob() {
    const { task: taskRaw, annotation, resolve } = this.queue.shift();

    const task = {
      id: taskRaw.id,
      annotations: taskRaw.annotations,
      predictions: taskRaw.predictions,
      data: taskRaw.data,
    };

    this.lsf.resetState();
    this.lsf.assignTask(task);
    this.lsf.initializeStore(taskToLSFormat(task));
    this.lsf.annotationStore.selectAnnotation(annotation.pk ?? annotation.id);

    await wait(1500);
    const preview = await this.createPreviews(5);

    resolve(preview);

    if (this.queue.length) {
      await this.processJob();
    }
  }

  async createPreviews(attempts) {
    if (attempts === 0) return;

    try {
      return this.lsf.annotationStore.selected.generatePreviews();
    } catch (err) {
      await wait(1000);
      return this.createPreviews(attempts - 1);
    }
  }
}

const injector = inject(({ store }) => {
  return {
    labelingConfig: store?.labelingConfig,
  };
});

export const AnnotationPreview = injector(
  observer(({ labelingConfig, name, task, annotation, style, ...props }) => {
    const generator = React.useMemo(() => {
      if (labelingConfig) return PreviewGenerator.getInstance(labelingConfig);
    }, [labelingConfig]);

    const [preview, setPreview] = React.useState(null);
    const variant = props.variant ?? "original";

    React.useEffect(() => {
      if (preview !== null) return;

      const start = async () => {
        if (generator && task && annotation) {
          const preview = await generator.generatePreview(task, annotation);

          setPreview(preview);
        }
      };

      start();
    }, [task, annotation, generator, preview]);

    return preview ? (
      <img
        {...imgDefaultProps}
        src={preview[`$${name}`][variant]}
        alt=""
        style={style}
        width={props.width}
        height={props.height}
      />
    ) : (
      <Block name="annotation-preview" width={props.width} height={props.height}>
        <Spinner
          size={props.size ?? "default"}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate3d(-50%, -50%, 0)",
            zIndex: 100,
          }}
        />
        <img
          src={props.fallbackImage}
          style={{ ...(style ?? {}), opacity: 0.5 }}
          alt=""
          width={props.width}
          height={props.height}
        />
      </Block>
    );
  }),
);
