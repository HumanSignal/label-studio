import React from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "../../../components";
import { useAPI } from "../../../providers/ApiProvider";
import { cn } from "../../../utils/bem";
import "./Config.prefix.css";
import { IconInfo } from "@humansignal/icons";
import { Button, EnterpriseBadge } from "@humansignal/ui";
import { translateTemplateGroup, translateTemplateTitle } from "./templateTitles";

const listClass = cn("templates-list");

const Arrow = () => {
  const { t } = useTranslation();

  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>{t("projects:tplArrowIcon")}</title>
      <path opacity="0.9" d="M2 10L6 6L2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
};

const TemplatesInGroup = ({ templates, group, onSelectRecipe, isEdition }) => {
  const { t } = useTranslation();
  const picked = templates
    .filter((recipe) => recipe.group === group)
    // templates without `order` go to the end of the list
    .sort((a, b) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY));

  const isCommunityEdition = isEdition === "Community";

  return (
    <ul>
      {picked.map((recipe) => {
        const isEnterpriseTemplate = recipe.type === "enterprise";
        const isDisabled = isCommunityEdition && isEnterpriseTemplate;

        return (
          <li
            key={recipe.title}
            onClick={() => !isDisabled && onSelectRecipe(recipe)}
            className={listClass.elem("template").mod({ disabled: isDisabled }).toClassName()}
            title={isDisabled ? t("projects:tplEnterpriseTooltip") : ""}
          >
            <img src={recipe.image} alt={""} />
            <div className="flex flex-col items-center w-full">
              <h3
                className={cn(
                  listClass.elem("template-title").toClassName(),
                  "flex flex-1 justify-center text-center w-full",
                )}
              >
                {translateTemplateTitle(recipe.title)}
              </h3>
              {isEnterpriseTemplate && isCommunityEdition && <EnterpriseBadge className="mb-base" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export const TemplatesList = ({ selectedGroup, selectedRecipe, onCustomTemplate, onSelectGroup, onSelectRecipe }) => {
  const { t } = useTranslation();
  const [groups, setGroups] = React.useState([]);
  const [templates, setTemplates] = React.useState();
  const api = useAPI();
  const isEdition = window?.APP_SETTINGS?.version_edition;

  React.useEffect(() => {
    const fetchData = async () => {
      const res = await api.callApi("configTemplates");

      if (!res) return;
      const { templates, groups } = res;

      setTemplates(templates);
      setGroups(groups);
    };
    fetchData();
  }, []);

  const selected = selectedGroup || groups[0];

  return (
    <div className={listClass}>
      <aside className={listClass.elem("sidebar").toClassName()}>
        <ul>
          {groups.map((group) => (
            <li
              key={group}
              onClick={() => onSelectGroup(group)}
              className={listClass
                .elem("group")
                .mod({
                  active: selected === group,
                  selected: selectedRecipe?.group === group,
                })
                .toClassName()}
            >
              {translateTemplateGroup(group)}
              <Arrow />
            </li>
          ))}
        </ul>
        <Button
          type="button"
          align="left"
          look="string"
          size="small"
          onClick={onCustomTemplate}
          className="w-full"
          aria-label={t("projects:tplCustomTemplateAria")}
        >
          {t("projects:tplCustomTemplate")}
        </Button>
      </aside>
      <main>
        {!templates && <Spinner style={{ width: "100%", height: 200 }} />}
        <TemplatesInGroup
          templates={templates || []}
          group={selected}
          onSelectRecipe={onSelectRecipe}
          isEdition={isEdition}
        />
      </main>
      <footer className="flex items-center justify-center gap-1">
        <IconInfo className={listClass.elem("info-icon").toClassName()} width="20" height="20" />
        <span>
          {t("projects:tplContributePrefix")}{" "}
          <a href="https://labelstud.io/guide" target="_blank" rel="noreferrer">
            {t("projects:tplContributeLink")}
          </a>
          {t("projects:tplContributeSuffix")}
        </span>
      </footer>
    </div>
  );
};
