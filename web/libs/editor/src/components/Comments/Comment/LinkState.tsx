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
  region: any;
  onUnlink?: (region: any) => void;
  interactive: boolean;
};

export const LinkState: FC<LinkStateProps> = ({ linking, region, onUnlink, interactive }) => {
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
      {mod?.display && <LinkedRegion item={region} onUnlink={onUnlink} interactive={interactive} />}
    </Block>
  );
};

type LinkedRegionProps = {
  item: any;
  onUnlink?: (item: any) => void;
  interactive: boolean;
};

const LinkedRegion: FC<LinkedRegionProps> = observer(({ item, interactive, onUnlink }) => {
  const itemColor = item?.background ?? item?.getOneColor?.();

  const { mouseEnterHandler, mouseLeaveHandler, clickHandler } = useMemo(() => {
    if (!interactive) return {};

    const mouseEnterHandler = () => {
      item?.setHighlight?.(true);
    };
    const mouseLeaveHandler = () => {
      item?.setHighlight?.(false);
    };
    const clickHandler = () => {
      item.annotation.selectArea(item);
    };
    return { mouseEnterHandler, mouseLeaveHandler, clickHandler };
  }, [interactive, item]);

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
      <Elem name="icon">
        <NodeIcon node={item} />
      </Elem>
      <Elem name="index">{item.region_index}</Elem>
      <Elem name="title">
        <Elem name="label">
          <RegionLabel item={item} />
        </Elem>
        {item?.text && <Elem name="text">{item.text.replace(/\\n/g, "\n")}</Elem>}
      </Elem>
      {onUnlink && (
        <Elem name="close">
          <Button size="small" type="text" icon={<LsClose />} onClick={onUnlink} />
        </Elem>
      )}
    </Block>
  );
});
