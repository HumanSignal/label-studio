import { type FC, useMemo } from "react";
import { observer } from "mobx-react";
import chroma from "chroma-js";
import { Button } from "@humansignal/ui";
import { IconCommentLinkTo, IconClose } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
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
    <div className={cn("link-state").mod(mod).toClassName()}>
      <div className={cn("link-state").elem("prefix").toClassName()}>
        <IconCommentLinkTo />
      </div>
      {mod?.action && "Select an object to link it to this comment."}
      {mod?.display && <LinkedRegion region={region} result={result} onUnlink={onUnlink} interactive={interactive} />}
    </div>
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
    <div
      className={cn("link-state-region").mod({ interactive }).toClassName()}
      style={style as any}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
      onClick={clickHandler}
    >
      {!isClassification && (
        <>
          <div className={cn("link-state-region").elem("icon").toClassName()}>
            <NodeIcon node={region} />
          </div>
          <div className={cn("link-state-region").elem("index").toClassName()}>{region.region_index}</div>
        </>
      )}
      {result ? (
        <div className={cn("link-state-region").elem("title").toClassName()}>
          <ResultText result={result} />
        </div>
      ) : (
        <div className={cn("link-state-region").elem("title").toClassName()}>
          <div className={cn("link-state-region").elem("label").toClassName()}>
            <RegionLabel item={region} />
          </div>
          {region?.text && (
            <div className={cn("link-state-region").elem("text").toClassName()}>
              {region.text.replace(/\\n/g, "\n")}
            </div>
          )}
        </div>
      )}
      {onUnlink && (
        <div className={cn("link-state-region").elem("close").toClassName()}>
          <Button
            size="small"
            variant="neutral"
            look="string"
            leading={<IconClose />}
            onClick={onUnlink}
            aria-label="Unlink comment"
          />
        </div>
      )}
    </div>
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
