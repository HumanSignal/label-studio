import { Typography } from "antd";
import { observer } from "mobx-react";
import { type FC, useEffect, useMemo, useRef } from "react";
import { Block, Elem, useBEM } from "../../../utils/bem";
import { RegionEditor } from "./RegionEditor";
import "./RegionDetails.scss";

const { Text } = Typography;

const TextResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return (
    <Text mark>
      {mainValue.map((value: string, i: number) => (
        <p key={`${value}-${i}`} data-counter={i + 1}>
          {value}
        </p>
      ))}
    </Text>
  );
});

const ChoicesResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return <Text mark>{mainValue.join(", ")}</Text>;
});

const RatingResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return <span>{mainValue}</span>;
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
        <Elem name="result">
          <Text>Rating: </Text>
          <Elem name="value">
            <RatingResult mainValue={mainValue} />
          </Elem>
        </Elem>
      );
    }
    if (type === "textarea") {
      return (
        <Elem name="result">
          <Text>Text: </Text>
          <Elem name="value">
            <TextResult mainValue={mainValue} />
          </Elem>
        </Elem>
      );
    }
    if (type === "choices") {
      return (
        <Elem name="result">
          <Text>Choices: </Text>
          <Elem name="value">
            <ChoicesResult mainValue={mainValue} />
          </Elem>
        </Elem>
      );
    }
    if (type === "taxonomy") {
      return (
        <Elem name="result">
          <Text>Taxonomy: </Text>
          <Elem name="value">
            <ChoicesResult mainValue={mainValue.map((v: string[]) => v.join("/"))} />
          </Elem>
        </Elem>
      );
    }
  }, [type, mainValue]);

  return content ? <Block name="region-meta">{content}</Block> : null;
});

export const RegionDetailsMain: FC<{ region: any }> = observer(({ region }) => {
  const meta = region.meta as any;
  const area = meta?.area;
  const bbox = meta?.bbox;

  return (
    <>
      {area != null || bbox ? (
        <Block name="region-meta">
          <Elem name="result">
            <Text>Geometry:</Text>
            <Elem name="value">
              {area != null && <div>Area (px): {area}</div>}
              {bbox && (
                <div>
                  BBox (px): x={bbox.x}, y={bbox.y}, w={bbox.width}, h={bbox.height}
                </div>
              )}
            </Elem>
          </Elem>
        </Block>
      ) : null}
      <Elem name="result">
        {(region?.results as any[]).map((res) => (
          <ResultItem key={res.pid} result={res} />
        ))}
        {region?.text ? (
          <Block name="region-meta">
            <Elem name="item">
              <Elem name="content" mod={{ type: "text" }}>
                {region.text.replace(/\\n/g, "\n")}
              </Elem>
            </Elem>
          </Block>
        ) : null}
      </Elem>
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
    const bem = useBEM();
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
            className={bem.elem("meta-text").toClassName()}
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
            <Elem name="meta-text" onClick={() => enterEditMode?.()}>
              {region.meta?.text}
            </Elem>
          )
        )}
      </>
    );
  },
);
