import { type FC, type MouseEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/bem";
import { IconCross } from "@humansignal/icons";
import "./HeidiTip.prefix.css";
import { Button } from "@humansignal/ui";
import { HeidiSpeaking } from "../../assets/images";
import type { HeidiTipProps, Tip } from "./types";
import { createURL } from "./utils";

const HeidiLink: FC<{ link: Tip["link"]; onClick: () => void }> = ({ link, onClick }) => {
  const { t } = useTranslation();
  const url = useMemo(() => {
    const params = link.params ?? {};
    /* if needed, add server ID here */

    return createURL(link.url, params);
  }, [link]);

  const treatment = link.params?.treatment;

  return (
    <a
      className={cn("heidy-tip").elem("link").toClassName()}
      href={url}
      target="_blank"
      onClick={onClick}
      rel="noreferrer"
    >
      {treatment ? t(`projects:heidi_${treatment}_label`, { defaultValue: link.label }) : link.label}
    </a>
  );
};

export const HeidiTip: FC<HeidiTipProps> = ({ tip, onDismiss, onLinkClick }) => {
  const { t } = useTranslation();
  const handleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  }, []);

  const treatment = tip.link?.params?.treatment;
  const title = treatment ? t(`projects:heidi_${treatment}_title`, { defaultValue: tip.title }) : tip.title;
  const content = treatment ? t(`projects:heidi_${treatment}_content`, { defaultValue: tip.content }) : tip.content;

  return (
    <div className={cn("heidy-tip").toClassName()}>
      <div className={cn("heidy-tip").elem("content").toClassName()}>
        <div className={cn("heidy-tip").elem("header").toClassName()}>
          <div className={cn("heidy-tip").elem("title").toClassName()}>{title}</div>
          {tip.closable && (
            <Button
              tooltip={t("projects:heidiDismiss", { defaultValue: "Don't show" })}
              look="string"
              size="small"
              onClick={handleClick}
              className="!p-0"
            >
              <IconCross />
            </Button>
          )}
        </div>
        <div className={cn("heidy-tip").elem("text").toClassName()}>
          {content}
          <HeidiLink link={tip.link} onClick={onLinkClick} />
        </div>
      </div>
      <div className={cn("heidy-tip").elem("heidi").toClassName()}>
        <HeidiSpeaking />
      </div>
    </div>
  );
};
