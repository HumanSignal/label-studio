import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/xml/xml';
import React from 'react';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { Button, ToggleItems } from '../../../components';
import { Form } from '../../../components/Form';
import { Oneof } from '../../../components/Oneof/Oneof';
import { cn } from '../../../utils/bem';
import { Palette } from '../../../utils/colors';
import { colorNames } from './colors';
import './Config.styl';
import { Preview } from './Preview';
import { DEFAULT_COLUMN, EMPTY_CONFIG, isEmptyConfig, Template } from './Template';
import { TemplatesList } from './TemplatesList';
import { useAPI } from '../../../providers/ApiProvider';

// don't do this, kids
const formatXML = (xml) => {
  let depth = 0;
  try {
    return xml.replace(/<(\/)?.*?(\/)?>[\s\n]*/g, (tag, close1, close2) => {
      if (!close1) {
        const res = "  ".repeat(depth) + tag.trim() + "\n";
        if (!close2) depth++;
        return res;
      } else {
        depth--;
        return "  ".repeat(depth) + tag.trim() + "\n";
      }
    });
  } catch (e) {
    return xml;
  }
};

const wizardClass = cn("wizard");
const configClass = cn("configure");

const EmptyConfigPlaceholder = () => (
  <div className={configClass.elem("empty-config")}>
    <p>Your labeling configuration is empty. It is required to label your data.</p>
    <p>
      Start from one of our predefined templates or create your own config on the Code panel.
      The labeling config is XML-based and you can <a href="https://labelstud.io/tags/" target="_blank">read about the available tags in our documentation</a>.
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
          onChange={e => template.changeLabel(label, { background: e.target.value })}
        />
      </label>
      <span>{value}</span>
      <button type="button" className={configClass.elem("delete-label")} onClick={() => template.removeLabel(label)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="red" strokeWidth="2" strokeLinecap="square" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12L12 2"/>
          <path d="M12 12L2 2"/>
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
  const onKeyPress = e => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      onAddLabels();
    }
  };

  return (
    <div className={configClass.elem("labels")}>
      <form className={configClass.elem("add-labels")} action="">
        <h4>{tagname === "Choices" ? "Add choices" : "Add label names"}</h4>
        <textarea name="labels" id="" cols="30" rows="5" ref={refLabels} onKeyPress={onKeyPress}></textarea>
        <input type="button" value="Add" onClick={onAddLabels} />
      </form>
      <div className={configClass.elem("current-labels")}>
        <h3>{tagname === "Choices" ? "Choices" : "Labels"} ({control.children.length})</h3>
        <ul>
          {Array.from(control.children).map(label => (
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

  const items = keys.map(key => {
    const options = settings[key];
    const type = Array.isArray(options.type) ? Array : options.type;
    const $object = template.objects[0];
    const $tag = options.control ? $object.$controls[0] : $object;
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
        onChange = e => {
          if (typeof options.param === "function") {
            options.param($tag, e.target.value);
          } else {
            $object.setAttribute(options.param, e.target.value);
          }
          template.render();
        };
        return (
          <li key={key}><label>{options.title} <select value={value} onChange={onChange}>{options.type.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}</select></label></li>
        );
      case Boolean:
        onChange = e => {
          if (typeof options.param === "function") {
            options.param($tag, e.target.checked);
          } else {
            $object.setAttribute(options.param, e.target.checked ? 'true' : 'false');
          }
          template.render();
        };
        return (
          <li key={key}><label><input type="checkbox" checked={value} onChange={onChange} /> {options.title}</label></li>
        );
      case String:
      case Number:
        size = options.type === Number ? 5 : undefined;
        onChange = e => {
          if (typeof options.param === "function") {
            options.param($object, e.target.value);
          } else {
            $object.setAttribute(options.param, e.target.value);
          }
          template.render();
        };
        return (
          <li key={key}><label>{options.title} <input type="text" onInput={onChange} value={value} size={size} /></label></li>
        );
    }
  });

  // check for active settings
  if (!items.filter(Boolean).length) return null;

  return (
    <ul className={configClass.elem("settings")}>
      <li>
        <h4>Configure settings</h4>
        <ul className={configClass.elem("object-settings")}>
          {items}
        </ul>
      </li>
    </ul>
  );
};

const ConfigureColumns = ({ columns, template }) => {
  const updateValue = obj => e => {
    const attrName = e.target.value.replace(/^\$/, "");
    obj.setAttribute("value", "$" + attrName);
    template.render();
  };

  if (!template.objects.length) return null;

  return (
    <div className={configClass.elem("object")}>
      <h4>Configure data</h4>
      {template.objects.length > 1 && columns?.length > 0 && columns.length < template.objects.length && (
        <p className={configClass.elem("object-error")}>This template requires more data then you have for now</p>
      )}
      {columns?.length === 0 && (
        <p className={configClass.elem("object-error")}>
          To select which field(s) to label you need to upload the data. Alternatively, you can provide it using Code mode.
        </p>
      )}
      {template.objects.map(obj => (
        <p key={obj.getAttribute("name")}>
          Use {obj.tagName.toLowerCase()}
          {template.objects > 1 && ` for ${obj.getAttribute("name")}`}
          {" from "}
          {columns?.length > 0 && columns[0] !== DEFAULT_COLUMN && "field "}
          <select onChange={updateValue(obj)} value={obj.getAttribute("value")?.replace(/^\$/, "")}>
            {columns?.map(column => (
              <option key={column} value={column}>
                {column === DEFAULT_COLUMN ? "<imported file>" : `$${column}`}
              </option>
            ))}
            {!columns?.length && (
              <option value={obj.getAttribute("value")?.replace(/^\$/, "")}>{"<imported file>"}</option>
            )}
          </select>
        </p>
      ))}
    </div>
  );
};

const Configurator = ({ columns, config, project, template, setTemplate, onBrowse, onSaveClick, onValidate, disableSaveButton }) => {
  const [configure, setConfigure] = React.useState(isEmptyConfig(config) ? "code" : "visual");
  const [visualLoaded, loadVisual] = React.useState(configure === "visual");
  const [waiting, setWaiting] = React.useState(false);
  const [error, setError] = React.useState();
  const [configToCheck, setConfigToCheck] = React.useState();
  const [data, setData] = React.useState();
  const debounceTimer = React.useRef();
  const api = useAPI();

  React.useEffect(() => {
    // config may change during init, so wait for that, but for a very short time only
    debounceTimer.current = window.setTimeout(() => setConfigToCheck(config), configToCheck ? 500 : 30);
    return () => window.clearTimeout(debounceTimer.current);
  }, [config]);

  React.useEffect(async () => {
    if (!configToCheck) return;

    const validation = await api.callApi(`validateConfig`, {
      params: { pk: project.id },
      body: { label_config: configToCheck },
      errorFilter: () => true,
    });

    if (validation?.error) {
      setError(validation.response);
      return;
    }

    setError(null);
    onValidate?.(validation);

    const sample = await api.callApi("createSampleTask", {
      params: {pk: project.id },
      body: { label_config: configToCheck },
      errorFilter: () => true,
    });

    if (sample && !sample.error) {
      setData(sample.sample_task);
    } else {
      // @todo validation can be done in this place,
      // @todo but for now it's extremely slow in /sample-task endpoint
      setError(sample?.response);
    }
  }, [configToCheck]);

  React.useEffect(() => { setError(null); }, [template, config]);

  // code should be reloaded on every render because of uncontrolled codemirror
  // visuals should be always rendered after first render
  // so load it on the first access, then just show/hide
  const onSelect = value => {
    setConfigure(value);
    if (value === "visual") loadVisual(true);
  };

  const onSave = async () => {
    setError(null);
    setWaiting(true);
    const res = await onSaveClick();
    setWaiting(false);
    if (res !== true) {
      setError(res);
    }
  };

  const extra = (
    <p className={configClass.elem('tags-link')}>
      Configure the labeling interface with tags.
      <br/>
      <a href="https://labelstud.io/tags/" target="_blank">See all available tags</a>
      .
    </p>
  );

  return (
    <div className={configClass}>
      <div className={configClass.elem("container")}>
        <header>
          <button onClick={onBrowse}>Browse Templates</button>
          <ToggleItems items={{ code: "Code", visual: "Visual" }} active={configure} onSelect={onSelect} />
        </header>
        <div className={configClass.elem('editor')}>
          {configure === "code" && (
            <div className={configClass.elem("code")} style={{ display: configure === "code" ? undefined : "none" }}>
              <CodeMirror
                name="code"
                id="edit_code"
                value={formatXML(config)}
                detach
                options={{ mode: "xml", theme: "default", lineNumbers: true }}
                onChange={(editor, data, value) => setTemplate(value)}
              />
            </div>
          )}
          {visualLoaded && (
            <div className={configClass.elem("visual")} style={{ display: configure === "visual" ? undefined : "none" }}>
              {isEmptyConfig(config) && <EmptyConfigPlaceholder />}
              <ConfigureColumns columns={columns} project={project} template={template} />
              {template.controls.map(control => <ConfigureControl control={control} template={template} key={control.getAttribute("name")} />)}
              <ConfigureSettings template={template} />
            </div>
          )}
        </div>
        {disableSaveButton !== true && onSaveClick && (
          <Form.Actions size="small" extra={configure === "code" && extra} valid>
            <Button look="primary" size="compact" style={{width: 120}} onClick={onSave} waiting={waiting}>
              Save
            </Button>
          </Form.Actions>
        )}
      </div>
      <Preview config={config} data={data} error={error} />
    </div>
  );
};

export const ConfigPage = ({ config: initialConfig = "", columns: externalColumns, project, onUpdate, onSaveClick, onValidate, disableSaveButton, show = true }) => {
  const [config, _setConfig] = React.useState("");
  const [mode, setMode] = React.useState("list"); // view | list
  const [selectedGroup, setSelectedGroup] = React.useState(null);
  const [selectedRecipe, setSelectedRecipe] = React.useState(null);
  const [template, setCurrentTemplate] = React.useState(null);
  const api = useAPI();

  const setConfig = React.useCallback(config => {
    _setConfig(config);
    onUpdate(config);
  }, [_setConfig, onUpdate]);

  const setTemplate = React.useCallback(config => {
    const tpl = new Template({ config });
    tpl.onConfigUpdate = setConfig;
    setConfig(config);
    setCurrentTemplate(tpl);
  }, [setConfig, setCurrentTemplate]);

  const [columns, setColumns] = React.useState();
  React.useEffect(() => { if (externalColumns?.length) setColumns(externalColumns); }, [externalColumns]);

  React.useEffect(async () => {
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

  React.useEffect(() => {
    if (columns?.length && template) {
      template.fixColumns(columns);
    }
  }, [columns, template]);

  const onSelectRecipe = React.useCallback(recipe => {
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
      <Oneof value={mode}>
        <TemplatesList
          case="list"
          selectedGroup={selectedGroup}
          selectedRecipe={selectedRecipe}
          onSelectGroup={setSelectedGroup}
          onSelectRecipe={onSelectRecipe}
          onCustomTemplate={onCustomTemplate}
        />
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
        />
      </Oneof>
    </div>
  );
};
