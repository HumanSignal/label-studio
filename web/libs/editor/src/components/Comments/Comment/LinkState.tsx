import { type FC, useMemo } from "react";
import { observer } from "mobx-react";
import chroma from "chroma-js";
import { Button } from "antd";

import { IconCommentLinkTo, LsClose } from "../../../assets/icons";
import { Block, Elem } from "../../../utils/bem";
import { NodeIcon } from "../../Node/Node";
import { RegionLabel } from "../../SidePanels/OutlinerPanel/RegionLabel";

import "./LinkState.scss";

type LinkStateProps = {
  linking: boolean;
  region: MSTRegion;
  result: MSTResult;
  onUnlink?: (region: any) => void;
  interactive?: boolean;
};

export const LinkState: FC<LinkStateProps> = ({ linking, region, result, onUnlink, interactive }) => {
  const isVisible = linking || region;
  const mod = useMemo(() => {
    if (linking) return { action: true };
    if (region) return { display: true };
    return undefined;
  }, [linking, region]);
  if (!isVisible) return null;
  return (
    <Block tag="div" name="link-state" mod={mod}>
      <Elem tag="div" name="prefix">
        <IconCommentLinkTo />
      </Elem>
      {mod?.action && "Select an object to link it to this comment."}
      {mod?.display && <LinkedRegion region={region} result={result} onUnlink={onUnlink} interactive={interactive} />}
    </Block>
  );
};

type LinkedRegionProps = {
  region: any;
  result?: MSTResult;
  onUnlink?: (item: any) => void;
  interactive?: boolean;
};

const LinkedRegion: FC<LinkedRegionProps> = observer(({ region, result, interactive, onUnlink }) => {
  const itemColor = region?.background ?? region?.getOneColor?.();
  const isClassification: boolean = region.classification;

  const { mouseEnterHandler, mouseLeaveHandler, clickHandler } = useMemo(() => {
    if (!interactive) return {};

    const mouseEnterHandler = () => {
      region?.setHighlight?.(true);
    };
    const mouseLeaveHandler = () => {
      region?.setHighlight?.(false);
    };
    const clickHandler = () => {
      if (region.classification) return null;
      region.annotation.selectArea(region);
    };
    return { mouseEnterHandler, mouseLeaveHandler, clickHandler };
  }, [interactive, region]);

  const style = useMemo(() => {
    const color = chroma(itemColor ?? "#666").alpha(1);
    return {
      "--icon-color": color.css(),
      "--text-color": color.css(),
    };
  }, [itemColor]);

  return (
    <Block
      name="link-state-region"
      mod={{ interactive }}
      style={style}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
      onClick={clickHandler}
    >
      {!isClassification && (
        <>
          <Elem name="icon">
            <NodeIcon node={region} />
          </Elem>
          <Elem name="index">{region.region_index}</Elem>
        </>
      )}
      {result ? (
        <Elem name="title">
          <ResultText result={result} />
        </Elem>
      ) : (
        <Elem name="title">
          <Elem name="label">
            <RegionLabel item={region} />
          </Elem>
          {region?.text && <Elem name="text">{region.text.replace(/\\n/g, "\n")}</Elem>}
        </Elem>
      )}
      {onUnlink && (
        <Elem name="close">
          <Button size="small" type="text" icon={<LsClose />} onClick={onUnlink} />
        </Elem>
      )}
    </Block>
  );
});

/**
 * Simply displaying the content of classification result
 */
const ResultText: FC<{ result: MSTResult }> = observer(({ result }) => {
  const { from_name: control, type, mainValue } = result;
  const { name } = control;

  if (type === "textarea") return [name, mainValue.join(" | ")].join(": ");
  if (type === "choices") return [name, mainValue.join(", ")].join(": ");
  if (type === "taxonomy") {
    const values = mainValue.map((v: string[]) => v.join("/"));
    return [name, values.join(", ")].join(": ");
  }

  return [name, String(mainValue)].join(": ");
});
