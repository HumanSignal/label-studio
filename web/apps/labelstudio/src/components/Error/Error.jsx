import { Fragment, useCallback, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { IconSlack } from "@humansignal/icons";
import { absoluteURL, copyText } from "../../utils/helpers";
import { Button } from "@humansignal/ui";
import { Space } from "../Space/Space";
import styles from "./Error.module.scss";

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
    <div className={styles["error-message"]}>
      {!minimal && possum !== false && (
        <img
          className={`${styles["error-message"]} ${styles["error-message__heidi"]}`}
          src={absoluteURL("/static/images/opossum_broken.svg")}
          height="111"
          alt="Heidi's down"
        />
      )}

      {!minimal && title && (
        <div className={`${styles["error-message"]} ${styles["error-message__title"]}`}>{title}</div>
      )}

      {!minimal && message && (
        <div
          className={`${styles["error-message"]} ${styles["error-message__detail"]}`}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(String(message)),
          }}
        />
      )}

      {!minimal && preparedStackTrace && (
        <div
          className={`${styles["error-message"]} ${styles["error-message__stracktrace"]}`}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(preparedStackTrace.replace(/(\n)/g, "<br>")),
          }}
        />
      )}

      {validation?.length > 0 && (
        <ul className={`${styles["error-message"]} ${styles["error-message__validation"]}`}>
          {validation.map(([field, errors]) => (
            <Fragment key={field}>
              {[].concat(errors).map((err, i) => (
                <li
                  key={i}
                  className={`${styles["error-message"]} ${styles["error-message__message"]}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(err) }}
                />
              ))}
            </Fragment>
          ))}
        </ul>
      )}

      {!minimal && (version || errorId) && (
        <div className={`${styles["error-message"]} ${styles["error-message__version"]}`}>
          <Space>
            {version && `Version: ${version}`}
            {errorId && `Error ID: ${errorId}`}
          </Space>
        </div>
      )}

      {!minimal && (
        <div className={`${styles["error-message"]} ${styles["error-message__actions"]}`}>
          <Space spread>
            <Button className={styles["error-message"]} target="_blank" icon={<IconSlack />} href={SLACK_INVITE_URL}>
              Ask on Slack
            </Button>

            <Space size="small">
              {preparedStackTrace && (
                <Button
                  disabled={copied}
                  onClick={copyStacktrace}
                  className="w-[100px]"
                  aria-label="Copy error stacktrace"
                >
                  {copied ? "Copied" : "Copy Stacktrace"}
                </Button>
              )}
              {onGoBack && (
                <Button onClick={onGoBack} aria-label="Go back">
                  Go Back
                </Button>
              )}
              {onReload && (
                <Button onClick={onReload} aria-label="Reload page">
                  Reload
                </Button>
              )}
            </Space>
          </Space>
        </div>
      )}
    </div>
  );
};
