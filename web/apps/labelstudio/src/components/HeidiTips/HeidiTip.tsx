import { type FC, type MouseEvent, useCallback, useMemo } from "react";
import { Block, Elem } from "../../utils/bem";
import { LsCross } from "../../assets/icons";
import "./HeidiTip.scss";
import { Button } from "../Button/Button";
import { HeidiSpeaking } from "../../assets/images";
import type { HeidiTipProps, Tip } from "./types";
import { Tooltip } from "../Tooltip/Tooltip";
import { createURL } from "./utils";

const HeidiLink: FC<{ link: Tip["link"] }> = ({ link }) => {
  const url = useMemo(() => {
    const params = link.params ?? {};
    /* if needed, add server ID here */

    return createURL(link.url, params);
  }, [link]);

  return (
    /* @ts-ignore-next-line */
    <Elem name="link" tag="a" href={url} target="_blank">
      {link.label}
    </Elem>
  );
};

export const HeidiTip: FC<HeidiTipProps> = ({ tip, onDismiss }) => {
  const handleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  }, []);

  return (
    <Block name="heidy-tip">
      <Elem name="content">
        <Elem name="header">
          <Elem name="title">{tip.title}</Elem>
          {tip.closable && (
            /* @ts-ignore-next-line */
            <Tooltip title="Don't show">
              {/* @ts-ignore-next-line */}
              <Elem name="dismiss" tag={Button} type="text" onClick={handleClick}>
                <LsCross />
              </Elem>
            </Tooltip>
          )}
        </Elem>
        <Elem name="text">
          {tip.content}
          <HeidiLink link={tip.link} />
        </Elem>
      </Elem>
      <Elem name="heidi">
        <HeidiSpeaking />
      </Elem>
    </Block>
  );
};
