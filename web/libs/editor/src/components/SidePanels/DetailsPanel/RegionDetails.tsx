import { observer } from "mobx-react";
import { type FC, useEffect, useMemo, useRef } from "react";
import { cn } from "../../../utils/bem";
import { RegionEditor } from "./RegionEditor";
import "./RegionDetails.scss";
import { Typography } from "@humansignal/ui";

const TextResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return (
    <div className="flex flex-col items-start gap-tighter">
      {mainValue.map((value: string, i: number) => (
        <mark
          key={`${value}-${i}`}
          className="bg-primary-background px-tighter py-tightest rounded-sm text-neutral-content"
        >
          <Typography data-counter={i + 1} size="small" className="!m-0">
            {value}
          </Typography>
        </mark>
      ))}
    </div>
  );
});

const ChoicesResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return (
    <mark className="bg-primary-background px-tighter py-tightest rounded-sm">
      <Typography as="span" size="small" className="text-neutral-content">
        {mainValue.join(", ")}
      </Typography>
    </mark>
  );
});

const RatingResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return <span>{mainValue}</span>;
});

const isNested = (value: unknown): boolean =>
  value !== null &&
  typeof value === "object" &&
  (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0);

const JsonValue: FC<{ value: unknown }> = ({ value }) => {
  // Primitives: string, number, boolean, null, undefined
  if (value === null) {
    return <span className="text-neutral-500 italic">null</span>;
  }
  if (value === undefined) {
    return <span className="text-neutral-500 italic">undefined</span>;
  }
  if (typeof value === "string") {
    return <span className="text-neutral-content">{value ? value : '""'}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-neutral-content">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-neutral-content">{value ? "true" : "false"}</span>;
  }

  // Arrays: list all items
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-neutral-500 italic">empty array</span>;
    }
    return (
      <>
        {value.map((item, index) => (
          <div key={index} className={isNested(item) ? "mt-1" : ""}>
            <span className="text-neutral-400 select-none">[{index}]</span>
            {isNested(item) ? (
              <div className="ml-1 pl-2 border-l border-neutral-200">
                <JsonValue value={item} />
              </div>
            ) : (
              <span className="ml-1">
                <JsonValue value={item} />
              </span>
            )}
          </div>
        ))}
      </>
    );
  }

  // Objects: nested key-value view
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-neutral-500 italic">empty object</span>;
    }
    return (
      <>
        {entries.map(([key, val]) => (
          <div key={key}>
            <span className="text-neutral-500">
              {key}
              {isNested(val) ? "" : ":"}
            </span>
            {isNested(val) ? (
              <div className="ml-1 pl-2 border-l border-neutral-200">
                <JsonValue value={val} />
              </div>
            ) : (
              <span className="ml-1">
                <JsonValue value={val} />
              </span>
            )}
          </div>
        ))}
      </>
    );
  }

  // Fallback: stringify other types
  try {
    return <span className="text-neutral-500">{JSON.stringify(value)}</span>;
  } catch {
    return <span className="text-neutral-500 italic">[unserializable]</span>;
  }
};

const ReactCodeResult: FC<{ mainValue: unknown }> = observer(({ mainValue }) => {
  return (
    <div className="text-sm">
      <JsonValue value={mainValue} />
    </div>
  );
});

export const ResultItem: FC<{ result: any }> = observer(({ result }) => {
  const { type, mainValue } = result;
  /**
   * @todo before fix this var was always false, so fix is left commented out
   * intention was to don't show per-region textarea text twice —
   * in region list and in region details; it failed but there were no complaints
   */
  // const isRegionList = from_name.displaymode === PER_REGION_MODES.REGION_LIST;

  const content = useMemo(() => {
    if (type === "rating") {
      return (
        <div className={cn("region-meta").elem("result").toClassName()}>
          <Typography size="small">Rating: </Typography>
          <div className={cn("region-meta").elem("value").toClassName()}>
            <RatingResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "textarea") {
      return (
        <div className={cn("region-meta").elem("result").toClassName()}>
          <Typography size="small">Text: </Typography>
          <div className={cn("region-meta").elem("value").toClassName()}>
            <TextResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "choices") {
      return (
        <div className={cn("region-meta").elem("result").toClassName()}>
          <Typography size="small">Choices: </Typography>
          <div className={cn("region-meta").elem("value").toClassName()}>
            <ChoicesResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "taxonomy") {
      return (
        <div className={cn("region-meta").elem("result").toClassName()}>
          <Typography size="small">Taxonomy: </Typography>
          <div className={cn("region-meta").elem("value").toClassName()}>
            <ChoicesResult mainValue={mainValue.map((v: string[]) => v.join("/"))} />
          </div>
        </div>
      );
    }
    if (type === "reactcode") {
      return (
        <div className={cn("region-meta").elem("result").toClassName()}>
          <div className={cn("region-meta").elem("value").toClassName()}>
            <ReactCodeResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
  }, [type, mainValue]);

  return content ? <div className={cn("region-meta").toClassName()}>{content}</div> : null;
});

export const RegionDetailsMain: FC<{ region: any }> = observer(({ region }) => {
  return (
    <>
      <div className={cn("detailed-region").elem("result").toClassName()}>
        {(region?.results as any[])
          // hide per-regions stored only in this session just for a better UX
          .filter((res) => res.canBeSubmitted)
          .map((res) => (
            <ResultItem key={res.pid} result={res} />
          ))}
        {/* @todo dirty hack to not duplicate text for OCR regions */}
        {/* @todo should be converted into universal solution */}
        {region?.text && !region?.ocrtext ? (
          <div className={cn("region-meta").toClassName()}>
            <div className={cn("region-meta").elem("item").toClassName()}>
              <div className={cn("region-meta").elem("content").mod({ type: "text" }).toClassName()}>
                {region.text.replace(/\\n/g, "\n")}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <RegionEditor region={region} />
    </>
  );
});

type RegionDetailsMetaProps = {
  region: any;
  editMode?: boolean;
  cancelEditMode?: () => void;
  enterEditMode?: () => void;
};

export const RegionDetailsMeta: FC<RegionDetailsMetaProps> = observer(
  ({ region, editMode, cancelEditMode, enterEditMode }) => {
    const input = useRef<HTMLTextAreaElement | null>();

    const saveMeta = (value: string) => {
      region.setMetaText(value);
    };

    useEffect(() => {
      if (editMode && input.current) {
        const { current } = input;

        current.focus();
        current.setSelectionRange(current.value.length, current.value.length);
      }
    }, [editMode]);

    return (
      <>
        {editMode ? (
          <textarea
            ref={(el) => (input.current = el)}
            placeholder="Meta"
            className={cn("detailed-region").elem("meta-text").toClassName()}
            value={region.meta.text}
            onChange={(e) => saveMeta(e.target.value)}
            onBlur={(e) => {
              saveMeta(e.target.value);
              cancelEditMode?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveMeta(e.target.value);
                cancelEditMode?.();
              }
            }}
          />
        ) : (
          region.meta?.text && (
            <div className={cn("detailed-region").elem("meta-text").toClassName()} onClick={() => enterEditMode?.()}>
              {region.meta?.text}
            </div>
          )
        )}
      </>
    );
  },
);
