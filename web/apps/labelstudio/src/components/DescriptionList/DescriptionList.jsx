import { cn } from "../../utils/bem";
import "./DescriptionList.prefix.css";
import { IconInfoOutline } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";

export const DescriptionList = ({ style, className, children }) => {
  return (
    <dl className={cn("dl").mix(className).toClassName()} style={style}>
      {children}
    </dl>
  );
};

DescriptionList.Item = ({ retmClassName, descriptionClassName, term, descriptionStyle, termStyle, children, help }) => {
  return (
    <>
      <dt className={cn("dl").elem("dt").mix(retmClassName).toClassName()} style={descriptionStyle}>
        {term}{" "}
        {help ? (
          <Tooltip style={{ whiteSpace: "pre-wrap" }} title={help}>
            <IconInfoOutline className={cn("help-icon").toClassName()} width="14" height="14" />
          </Tooltip>
        ) : (
          ""
        )}
      </dt>
      <dd className={cn("dl").elem("dd").mix(descriptionClassName).toClassName()} style={termStyle}>
        {children}
      </dd>
    </>
  );
};
