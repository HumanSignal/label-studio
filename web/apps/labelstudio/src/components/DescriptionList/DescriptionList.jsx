import React from "react";
import { cn } from "../../utils/bem";
import "./DescriptionList.scss";
import { IconInfoOutline } from "../../assets/icons";
import { Tooltip } from "../../components/Tooltip/Tooltip";

export const DescriptionList = ({ style, className, children }) => {
  return (
    <dl className={cn("dl").mix(className)} style={style}>
      {children}
    </dl>
  );
};

DescriptionList.Item = ({ retmClassName, descriptionClassName, term, descriptionStyle, termStyle, children, help }) => {
  return (
    <>
      <dt className={cn("dl").elem("dt").mix(retmClassName)} style={descriptionStyle}>
        {term}{" "}
        {help ? (
          <Tooltip style={{ whiteSpace: "pre-wrap" }} title={help}>
            <IconInfoOutline className={cn("help-icon")} width="14" height="14" />
          </Tooltip>
        ) : (
          ""
        )}
      </dt>
      <dd className={cn("dl").elem("dd").mix(descriptionClassName)} style={termStyle}>
        {children}
      </dd>
    </>
  );
};
