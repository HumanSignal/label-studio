import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/xml/xml';
import React from 'react';
import { Spinner } from '../../../components';
import { useAPI } from '../../../providers/ApiProvider';
import { cn } from '../../../utils/bem';
import './Config.styl';
import { IconInfo } from '../../../assets/icons';
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import "../../../translations/i18n"

const listClass = cn("templates-list");

const Arrow = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="0.9" d="M2 10L6 6L2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
  </svg>
);

const TemplatesInGroup = ({ templates, group, onSelectRecipe }) => {
  const picked = templates
    .filter(recipe => recipe.group === group)
    // templates without `order` go to the end of the list
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  return (
    <ul>
      {picked.map(recipe => (
        <li
          key={recipe.title}
          onClick={() => onSelectRecipe(recipe)}
          className={listClass.elem("template")}
        >
          <img src={recipe.image} />
          <h3>{recipe.title}</h3>
        </li>
      ))}
    </ul>
  );
};

export const TemplatesList = ({ selectedGroup, selectedRecipe, onCustomTemplate, onSelectGroup, onSelectRecipe }) => {
  const { t } = useTranslation();
  const [groups, setGroups] = React.useState([]);
  const [templates, setTemplates] = React.useState();
  const api = useAPI();

  React.useEffect(async () => {
    const res = await api.callApi('configTemplates', { params: { language: i18n.language } });
    if (!res) return;
    const { templates, groups } = res;
    setTemplates(templates);
    setGroups(groups);
  }, []);

  const selected = selectedGroup || groups[0];

  return (
    <div className={listClass}>
      <aside className={listClass.elem("sidebar")}>
        <ul>
          {groups.map(group => (
            <li
              key={group}
              onClick={() => onSelectGroup(group)}
              className={listClass.elem("group").mod({
                active: selected === group,
                selected: selectedRecipe?.group === group,
              })}
            >
              {group}
              <Arrow />
            </li>
          ))}
        </ul>
        <button type="button" onClick={onCustomTemplate} className={listClass.elem("custom-template")}>{t("pages.create_project.config_label.custom_template")}</button>
      </aside>
      <main>
        {!templates && <Spinner style={{ width: "100%", height: 200 }} />}
        <TemplatesInGroup templates={templates || []} group={selected} onSelectRecipe={onSelectRecipe} />
      </main>
      <footer>
        <IconInfo className={listClass.elem("info-icon")} width="20" height="20" />
        {t("pages.create_project.config_label.footer_mst_part1")}<a href="https://labelstud.io/guide" target="_blank">{t("pages.create_project.config_label.footer_mst_part2")}</a>
      </footer>
    </div>
  );
};
