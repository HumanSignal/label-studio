import { type FC, type MouseEvent, useCallback, useMemo } from "react";
import { cn } from "../../utils/bem";
import { IconCross } from "@humansignal/icons";
import "./HeidiTip.scss";
import { Button } from "@humansignal/ui";
import { HeidiSpeaking } from "../../assets/images";
import type { HeidiTipProps, Tip } from "./types";
import { createURL } from "./utils";

const HeidiLink: FC<{ link: Tip["link"]; onClick: () => void }> = ({ link, onClick }) => {
  const url = useMemo(() => {
    const params = link.params ?? {};
    /* if needed, add server ID here */

    return createURL(link.url, params);
  }, [link]);

  return (
    <a
      className={cn("heidy-tip").elem("link").toClassName()}
      href={url}
      target="_blank"
      onClick={onClick}
      rel="noreferrer"
    >
      {link.label}
    </a>
  );
};

export const HeidiTip: FC<HeidiTipProps> = ({ tip, onDismiss, onLinkClick }) => {
  const handleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  }, []);

  return (
    <div className={cn("heidy-tip").toClassName()}>
      <div className={cn("heidy-tip").elem("content").toClassName()}>
        <div className={cn("heidy-tip").elem("header").toClassName()}>
          <div className={cn("heidy-tip").elem("title").toClassName()}>{tip.title}</div>
          {tip.closable && (
            <Button tooltip="Don't show" look="string" size="small" onClick={handleClick} className="!p-0">
              <IconCross />
            </Button>
          )}
        </div>
        <div className={cn("heidy-tip").elem("text").toClassName()}>
          {tip.content}
          <HeidiLink link={tip.link} onClick={onLinkClick} />
        </div>
      </div>
      <div className={cn("heidy-tip").elem("heidi").toClassName()}>
        <HeidiSpeaking />
      </div>
    </div>
  );
};
