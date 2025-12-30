import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import sanitizeHtml from "sanitize-html";
import { IconSlack } from "@humansignal/icons";
import { cn } from "../../utils/bem";
import { absoluteURL, copyText } from "../../utils/helpers";
import { Button } from "@humansignal/ui";
import { Space } from "../Space/Space";
import "./Error.scss";

const SLACK_INVITE_URL = "https://slack.labelstud.io/?source=product-error-msg";

export const ErrorWrapper = ({
  title,
  message,
  errorId,
  stacktrace,
  validation,
  version,
  onGoBack,
  onReload,
  possum = false,
  minimal = false,
}) => {
  const { t } = useTranslation();
  const preparedStackTrace = useMemo(() => {
    return (stacktrace ?? "").trim();
  }, [stacktrace]);

  const [copied, setCopied] = useState(false);

  const copyStacktrace = useCallback(() => {
    setCopied(true);
    copyText(preparedStackTrace);
    setTimeout(() => setCopied(false), 1200);
  }, [preparedStackTrace]);

  return (
    <div className={cn("error-message").toClassName()}>
      {!minimal && possum !== false && (
          <img
            className={cn("error-message").elem("heidi").toClassName()}
            src={absoluteURL("/static/images/opossum_broken.svg")}
            height="111"
            alt={t("error.heidiAlt", { defaultValue: "Heidi's down" })}
          />
      )}

      {!minimal && title && <div className={cn("error-message").elem("title").toClassName()}>{title}</div>}

      {!minimal && message && (
        <div
          className={cn("error-message").elem("detail").toClassName()}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(String(message)),
          }}
        />
      )}

      {!minimal && preparedStackTrace && (
        <div
          className={cn("error-message").elem("stracktrace").toClassName()}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(preparedStackTrace.replace(/(\n)/g, "<br>")),
          }}
        />
      )}

      {validation?.length > 0 && (
        <ul className={cn("error-message").elem("validation").toClassName()}>
          {validation.map(([field, errors]) => (
            <Fragment key={field}>
              {[].concat(errors).map((err, i) => (
                <li
                  key={i}
                  className={cn("error-message").elem("message").toClassName()}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(err) }}
                />
              ))}
            </Fragment>
          ))}
        </ul>
      )}

      {!minimal && (version || errorId) && (
        <div className={cn("error-message").elem("version").toClassName()}>
          <Space>
            {version && t("error.version", { defaultValue: "Version: {{version}}", version })}
            {errorId && t("error.errorId", { defaultValue: "Error ID: {{id}}", id: errorId })}
          </Space>
        </div>
      )}

      {!minimal && (
        <div className={cn("error-message").elem("actions").toClassName()}>
          <Space spread>
            <Button
              className={cn("error-message").elem("action-slack").toClassName()}
              target="_blank"
              icon={<IconSlack />}
              href={SLACK_INVITE_URL}
            >
              {t("error.askOnSlack", { defaultValue: "Ask on Slack" })}
            </Button>

            <Space size="small">
              {preparedStackTrace && (
                <Button
                      disabled={copied}
                      onClick={copyStacktrace}
                      className="w-[100px]"
                      aria-label={t('error.copyStacktraceAria', { defaultValue: 'Copy error stacktrace' })}
                    >
                      {copied ? t('error.copied', { defaultValue: 'Copied' }) : t('error.copyStacktrace', { defaultValue: 'Copy Stacktrace' })}
                    </Button>
              )}
              {onGoBack && (
                <Button onClick={onGoBack} aria-label={t('error.goBackAria', { defaultValue: 'Go back' })}>
                  {t('error.goBack', { defaultValue: 'Go Back' })}
                </Button>
              )}
              {onReload && (
                <Button onClick={onReload} aria-label={t('error.reloadAria', { defaultValue: 'Reload page' })}>
                  {t('error.reload', { defaultValue: 'Reload' })}
                </Button>
              )}
            </Space>
          </Space>
        </div>
      )}
    </div>
  );
};
