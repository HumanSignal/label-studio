import "codemirror/lib/codemirror.css";
import "codemirror/mode/xml/xml";
import React, { useEffect, useState } from "react";
import { UnControlled as CodeMirror } from "react-codemirror2";
import CM from "codemirror";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/show-hint.css";

import { Button, ToggleItems } from "../../../components";
import { Form } from "../../../components/Form";
import { useAPI } from "../../../providers/ApiProvider";
import { Block, cn, Elem } from "../../../utils/bem";
import { Palette } from "../../../utils/colors";
import { colorNames } from "./colors";
import "./Config.styl";
import { Preview } from "./Preview";
import { DEFAULT_COLUMN, EMPTY_CONFIG, isEmptyConfig, Template } from "./Template";
import { TemplatesList } from "./TemplatesList";

import "./codemirror.css";
import "./config-hint";
import tags from "./schema.json";

const wizardClass = cn("wizard");
const configClass = cn("configure");

const EmptyConfigPlaceholder = () => (
  <div className={configClass.elem("empty-config")}>
    <p>Your labeling configuration is empty. It is required to label your data.</p>
    <p>
      Start from one of our predefined templates or create your own config on the Code panel. The labeling config is
      XML-based and you can{" "}
      <a href="https://labelstud.io/tags/" target="_blank" rel="noreferrer">
        read about the available tags in our documentation
      </a>
      .
    </p>
  </div>
);

const Label = ({ label, template, color }) => {
  const value = label.getAttribute("value");

  return (
    <li className={configClass.elem("label").mod({ choice: label.tagName === "Choice" })}>
      <label style={{ background: color }}>
        <input
          type="color"
          className={configClass.elem("label-color")}
          value={colorNames[color] || color}
          onChange={(e) => template.changeLabel(label, { background: e.target.value })}
        />
      </label>
      <span>{value}</span>
      <button
        type="button"
        className={configClass.elem("delete-label")}
        onClick={() => template.removeLabel(label)}
        aria-label="delete label"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="red"
          strokeWidth="2"
          strokeLinecap="square"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 12L12 2" />
          <path d="M12 12L2 2" />
        </svg>
      </button>
    </li>
  );
};

const ConfigureControl = ({ control, template }) => {
  const refLabels = React.useRef();
  const tagname = control.tagName;

  if (tagname !== "Choices" && !tagname.endsWith("Labels")) return null;
  const palette = Palette();

  const onAddLabels = () => {
    if (!refLabels.current) return;
    template.addLabels(control, refLabels.current.value);
    refLabels.current.value = "";
  };
  const onKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      onAddLabels();
    }
  };

  return (
    <div className={configClass.elem("labels")}>
      <form className={configClass.elem("add-labels")} action="">
        <h4>{tagname === "Choices" ? "Add choices" : "Add label names"}</h4>
        <span>Use new line as a separator to add multiple labels</span>
        <textarea name="labels" id="" cols="30" rows="5" ref={refLabels} onKeyPress={onKeyPress} />
        <input type="button" value="Add" onClick={onAddLabels} />
      </form>
      <div className={configClass.elem("current-labels")}>
        <h3>
          {tagname === "Choices" ? "Choices" : "Labels"} ({control.children.length})
        </h3>
        <ul>
          {Array.from(control.children).map((label) => (
            <Label
              label={label}
              template={template}
              key={label.getAttribute("value")}
              color={label.getAttribute("background") || palette.next().value}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

const ConfigureSettings = ({ template }) => {
  const { settings } = template;

  if (!settings) return null;
  const keys = Object.keys(settings);

  const items = keys.map((key) => {
    const options = settings[key];
    const type = Array.isArray(options.type) ? Array : options.type;
    const $object = options.object;
    const $tag = options.control ? options.control : $object;

    if (!$tag) return null;
    if (options.when && !options.when($tag)) return;
    let value = false;

    if (options.value) value = options.value($tag);
    else if (typeof options.param === "string") value = $tag.getAttribute(options.param);
    if (value === "true") value = true;
    if (value === "false") value = false;
    let onChange;
    let size;

    switch (type) {
      case Array:
        onChange = (e) => {
          if (typeof options.param === "function") {
            options.param($tag, e.target.value);
          } else {
            $object.setAttribute(options.param, e.target.value);
          }
          template.render();
        };
        return (
          <li key={key}>
            <label>
              {options.title}{" "}
              <select value={value} onChange={onChange}>
                {options.type.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </li>
        );
      case Boolean:
        onChange = (e) => {
          if (typeof options.param === "function") {
            options.param($tag, e.target.checked);
          } else {
            $object.setAttribute(options.param, e.target.checked ? "true" : "false");
          }
          template.render();
        };
        return (
          <li key={key}>
            <label>
              <input type="checkbox" checked={value} onChange={onChange} /> {options.title}
            </label>
          </li>
        );
      case String:
      case Number:
        size = options.type === Number ? 5 : undefined;
        onChange = (e) => {
          if (typeof options.param === "function") {
            options.param($tag, e.target.value);
          } else {
            $object.setAttribute(options.param, e.target.value);
          }
          template.render();
        };
        return (
          <li key={key}>
            <label>
              {options.title} <input type="text" onInput={onChange} value={value} size={size} />
            </label>
          </li>
        );
    }
  });

  // check for active settings
  if (!items.filter(Boolean).length) return null;

  return (
    <ul className={configClass.elem("settings")}>
      <li>
        <h4>Configure settings</h4>
        <ul className={configClass.elem("object-settings")}>{items}</ul>
      </li>
    </ul>
  );
};

// configure value source for `obj` object tag
const ConfigureColumn = ({ template, obj, columns }) => {
  const value = obj.getAttribute("value")?.replace(/^\$/, "");
  // if there is a value set already and it's not in the columns
  // or data was not uploaded yet
  const [isManual, setIsManual] = useState(!!value && !columns?.includes(value));
  // value is stored in state to make input conrollable
  // changes will be sent by Enter and blur
  const [newValue, setNewValue] = useState(`$${value}`);

  // update local state when external value changes
  useEffect(() => setNewValue(`$${value}`), [value]);

  const updateValue = (value) => {
    const newValue = value.replace(/^\$/, "");

    obj.setAttribute("value", `$${newValue}`);
    template.render();
  };

  const selectValue = (e) => {
    const value = e.target.value;

    if (value === "-") {
      setIsManual(true);
      return;
    }
    if (isManual) {
      setIsManual(false);
    }

    updateValue(value);
  };

  const handleChange = (e) => {
    const newValue = e.target.value.replace(/^\$/, "");

    setNewValue(`$${newValue}`);
  };

  const handleBlur = () => {
    updateValue(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateValue(e.target.value);
    }
  };

  return (
    <p>
      Use {obj.tagName.toLowerCase()}
      {template.objects > 1 && ` for ${obj.getAttribute("name")}`}
      {" from "}
      {columns?.length > 0 && columns[0] !== DEFAULT_COLUMN && "field "}
      <select onChange={selectValue} value={isManual ? "-" : value}>
        {columns?.map((column) => (
          <option key={column} value={column}>
            {column === DEFAULT_COLUMN ? "<imported file>" : `$${column}`}
          </option>
        ))}
        {!columns?.length && <option value={value}>{"<imported file>"}</option>}
        <option value="-">{"<set manually>"}</option>
      </select>
      {isManual && <input value={newValue} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} />}
    </p>
  );
};

const ConfigureColumns = ({ columns, template }) => {
  if (!template.objects.length) return null;

  return (
    <div className={configClass.elem("object")}>
      <h4>Configure data</h4>
      {template.objects.length > 1 && columns?.length > 0 && columns.length < template.objects.length && (
        <p className={configClass.elem("object-error")}>This template requires more data then you have for now</p>
      )}
      {columns?.length === 0 && (
        <p className={configClass.elem("object-error")}>
          To select which field(s) to label you need to upload the data. Alternatively, you can provide it using Code
          mode.
        </p>
      )}
      {template.objects.map((obj) => (
        <ConfigureColumn key={obj.getAttribute("name")} {...{ obj, template, columns }} />
      ))}
    </div>
  );
};

const Configurator = ({
  columns,
  config,
  project,
  template,
  setTemplate,
  onBrowse,
  onSaveClick,
  onValidate,
  disableSaveButton,
  warning,
}) => {
  const [configure, setConfigure] = React.useState(isEmptyConfig(config) ? "code" : "visual");
  const [visualLoaded, loadVisual] = React.useState(configure === "visual");
  const [waiting, setWaiting] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // config update is debounced because of user input
  const [configToCheck, setConfigToCheck] = React.useState();
  // then we wait for validation and sample data for this config
  const [error, setError] = React.useState();
  const [parserError, setParserError] = React.useState();
  const [data, setData] = React.useState();
  const [loading, setLoading] = useState(false);
  // and only with them we'll update config in preview
  const [configToDisplay, setConfigToDisplay] = React.useState(config);

  const debounceTimer = React.useRef();
  const api = useAPI();

  React.useEffect(() => {
    // config may change during init, so wait for that, but for a very short time only
    debounceTimer.current = window.setTimeout(() => setConfigToCheck(config), configToCheck ? 500 : 30);
    return () => window.clearTimeout(debounceTimer.current);
  }, [config]);

  React.useEffect(async () => {
    if (!configToCheck) return;

    setLoading(true);

    const validation = await api.callApi("validateConfig", {
      params: { pk: project.id },
      body: { label_config: configToCheck },
      errorFilter: () => true,
    });

    if (validation?.error) {
      setError(validation.response);
      setLoading(false);
      return;
    }

    setError(null);
    onValidate?.(validation);

    const sample = await api.callApi("createSampleTask", {
      params: { pk: project.id },
      body: { label_config: configToCheck },
      errorFilter: () => true,
    });

    setLoading(false);
    if (sample && !sample.error) {
      setData(sample.sample_task);
      setConfigToDisplay(configToCheck);
    } else {
      // @todo validation can be done in this place,
      // @todo but for now it's extremely slow in /sample-task endpoint
      setError(sample?.response);
    }
  }, [configToCheck]);

  // code should be reloaded on every render because of uncontrolled codemirror
  // visuals should be always rendered after first render
  // so load it on the first access, then just show/hide
  const onSelect = (value) => {
    setConfigure(value);
    if (value === "visual") loadVisual(true);
  };

  const onChange = React.useCallback(
    (config) => {
      try {
        setParserError(null);
        setTemplate(config);
      } catch (e) {
        setParserError({
          detail: "Parser error",
          validation_errors: [e.message],
        });
      }
    },
    [setTemplate],
  );

  const onSave = async () => {
    setError(null);
    setWaiting(true);
    const res = await onSaveClick();

    setWaiting(false);

    if (res === true) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } else {
      setError(res);
    }
  };

  function completeAfter(cm, pred) {
    if (!pred || pred()) {
      setTimeout(() => {
        if (!cm.state.completionActive) cm.showHint({ completeSingle: false });
      }, 100);
    }
    return CM.Pass;
  }

  function completeIfInTag(cm) {
    return completeAfter(cm, () => {
      const token = cm.getTokenAt(cm.getCursor());

      if (token.type === "string" && (!/['"]$/.test(token.string) || token.string.length === 1)) return false;

      const inner = CM.innerMode(cm.getMode(), token.state).state;

      return inner.tagName;
    });
  }

  const extra = (
    <p className={configClass.elem("tags-link")}>
      Configure the labeling interface with tags.
      <br />
      <a href="https://labelstud.io/tags/" target="_blank" rel="noreferrer">
        See all available tags
      </a>
      .
    </p>
  );

  return (
    <div className={configClass}>
      <div className={configClass.elem("container")}>
        <h1>Labeling Interface</h1>
        <header>
          <button onClick={onBrowse}>Browse Templates</button>
          <ToggleItems items={{ code: "Code", visual: "Visual" }} active={configure} onSelect={onSelect} />
        </header>
        <div className={configClass.elem("editor")}>
          {configure === "code" && (
            <div className={configClass.elem("code")} style={{ display: configure === "code" ? undefined : "none" }}>
              <CodeMirror
                name="code"
                id="edit_code"
                value={config}
                autoCloseTags={true}
                smartIndent={true}
                detach
                extensions={["hint", "xml-hint"]}
                options={{
                  mode: "xml",
                  theme: "default",
                  lineNumbers: true,
                  extraKeys: {
                    "'<'": completeAfter,
                    // "'/'": completeIfAfterLt,
                    "' '": completeIfInTag,
                    "'='": completeIfInTag,
                    "Ctrl-Space": "autocomplete",
                  },
                  hintOptions: { schemaInfo: tags },
                }}
                // don't close modal with Escape while editing config
                onKeyDown={(editor, e) => {
                  if (e.code === "Escape") e.stopPropagation();
                }}
                onChange={(editor, data, value) => onChange(value)}
              />
            </div>
          )}
          {visualLoaded && (
            <div
              className={configClass.elem("visual")}
              style={{ display: configure === "visual" ? undefined : "none" }}
            >
              {isEmptyConfig(config) && <EmptyConfigPlaceholder />}
              <ConfigureColumns columns={columns} project={project} template={template} />
              {template.controls.map((control) => (
                <ConfigureControl control={control} template={template} key={control.getAttribute("name")} />
              ))}
              <ConfigureSettings template={template} />
            </div>
          )}
        </div>
        {disableSaveButton !== true && onSaveClick && (
          <Form.Actions size="small" extra={configure === "code" && extra} valid>
            {saved && (
              <Block name="form-indicator">
                <Elem tag="span" mod={{ type: "success" }} name="item">
                  Saved!
                </Elem>
              </Block>
            )}
            <Button look="primary" size="compact" style={{ width: 120 }} onClick={onSave} waiting={waiting}>
              {waiting ? "Saving..." : "Save"}
            </Button>
          </Form.Actions>
        )}
      </div>
      <Preview
        config={configToDisplay}
        data={data}
        project={project}
        loading={loading}
        error={parserError || error || (configure === "code" && warning)}
      />
    </div>
  );
};

export const ConfigPage = ({
  config: initialConfig = "",
  columns: externalColumns,
  project,
  onUpdate,
  onSaveClick,
  onValidate,
  disableSaveButton,
  show = true,
}) => {
  const [config, _setConfig] = React.useState("");
  const [mode, setMode] = React.useState("list"); // view | list
  const [selectedGroup, setSelectedGroup] = React.useState(null);
  const [selectedRecipe, setSelectedRecipe] = React.useState(null);
  const [template, setCurrentTemplate] = React.useState(null);
  const api = useAPI();

  const setConfig = React.useCallback(
    (config) => {
      _setConfig(config);
      onUpdate(config);
    },
    [_setConfig, onUpdate],
  );

  const setTemplate = React.useCallback(
    (config) => {
      const tpl = new Template({ config });

      tpl.onConfigUpdate = setConfig;
      setConfig(config);
      setCurrentTemplate(tpl);
    },
    [setConfig, setCurrentTemplate],
  );

  const [columns, setColumns] = React.useState();

  React.useEffect(() => {
    if (externalColumns?.length) setColumns(externalColumns);
  }, [externalColumns]);

  const [warning, setWarning] = React.useState();

  React.useEffect(async () => {
    if (externalColumns) return; // we are in Create Project dialog, so this request is useless
    if (!project || columns) return;
    const res = await api.callApi("dataSummary", {
      params: { pk: project.id },
      // 404 is ok, and errors here don't matter
      errorFilter: () => true,
    });

    if (res?.common_data_columns) {
      setColumns(res.common_data_columns);
    }
  }, [columns, project]);

  const onSelectRecipe = React.useCallback((recipe) => {
    if (!recipe) {
      setSelectedRecipe(null);
      setMode("list");
      return;
    }
    setTemplate(recipe.config);
    setSelectedRecipe(recipe);
    setMode("view");
  });

  const onCustomTemplate = React.useCallback(() => {
    setTemplate(EMPTY_CONFIG);
    setMode("view");
  });

  React.useEffect(() => {
    if (initialConfig) {
      setTemplate(initialConfig);
      setMode("view");
    }
  }, []);

  if (!show) return null;

  return (
    <div className={wizardClass} data-mode="list" id="config-wizard">
      {mode === "list" && (
        <TemplatesList
          case="list"
          selectedGroup={selectedGroup}
          selectedRecipe={selectedRecipe}
          onSelectGroup={setSelectedGroup}
          onSelectRecipe={onSelectRecipe}
          onCustomTemplate={onCustomTemplate}
        />
      )}
      {mode === "view" && (
        <Configurator
          case="view"
          columns={columns}
          config={config}
          project={project}
          selectedRecipe={selectedRecipe}
          template={template}
          setTemplate={setTemplate}
          onBrowse={setMode.bind(null, "list")}
          onValidate={onValidate}
          disableSaveButton={disableSaveButton}
          onSaveClick={onSaveClick}
          warning={warning}
        />
      )}
    </div>
  );
};
