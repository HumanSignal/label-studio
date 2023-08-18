import { FC, MouseEvent, useCallback } from "react";
import { Block, Elem } from "../../utils/bem";
// @ts-ignore-next-line
import { LsCross } from "../../assets/icons";
import "./HeidiTip.styl";
import { Button } from "../Button/Button";
import { HeidiSpeaking } from "../../assets/images";
import { HeidiTipProps } from "./types";
import { Tooltip } from "../Tooltip/Tooltip"

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
          <Elem name="title">
            {tip.title}
          </Elem>
          {tip.closable && (
            /* @ts-ignore-next-line */
            <Tooltip title="Don't show">
              { /* @ts-ignore-next-line */}
              <Elem name="dismiss" tag={Button} type="text" onClick={handleClick}>
                <LsCross />
              </Elem>
            </Tooltip>
          )}
        </Elem>
        <Elem name="text">
          {tip.content}
          { /* @ts-ignore-next-line */}
          <Elem name="link" tag="a" href={tip.link.url}>
            {tip.link.label}
          </Elem>
        </Elem>
      </Elem>
      <Elem name="heidi">
        <HeidiSpeaking />
      </Elem>
    </Block>
  );
}
