import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { Select } from "@humansignal/ui";
import ColorScheme from "pleasejs";
import Utils from "../../../utils";
import styles from "./Paragraphs.module.css";

const AuthorTag = ({ name, selected }) => {
  const itemStyle = { border: `2px solid ${Utils.Colors.convertToRGBA(ColorScheme.make_color({ seed: name })[0])}` };

  if (name === "all") {
    return <>Show all authors</>;
  }

  return (
    <span
      className={[styles.authorFilter__select__item, selected && styles.authorFilter__select__item_selected].join(" ")}
      style={itemStyle}
    >
      {name}
    </span>
  );
};

const renderMultipleSelected = (selected) => {
  if (selected.length === 0) return null;

  return (
    <div className={styles.authorFilter__select}>
      {selected.map((name) => (
        <AuthorTag key={name} name={name} />
      ))}
    </div>
  );
};

export const AuthorFilter = observer(({ item, onChange }) => {
  const placeholder = useMemo(() => <span className={styles.authorFilter__placeholder}>Show all authors</span>, []);
  const initialValue = "all";
  const options = useMemo(() => {
    const authorOptions = item._value
      .reduce((all, v) => (all.includes(v[item.namekey]) ? all : [...all, v[item.namekey]]), [])
      .sort()
      .map((name) => ({
        value: name,
        label: <AuthorTag name={name} />,
      }));
    return [{ value: initialValue, label: <AuthorTag name={initialValue} />, children: authorOptions }];
  }, [item._value, item.namekey, initialValue]);

  const onFilterChange = useCallback(
    (next) => {
      const nextVal = next?.value ?? next;
      // ensure this is cleared if any action promoting an empty value change is made
      if (!nextVal || nextVal?.includes("all")) {
        item.setAuthorFilter([]);
      } else if (nextVal) {
        item.setAuthorFilter(nextVal);
      }

      onChange?.();
    },
    [item.setAuthorFilter],
  );

  return (
    <div className={styles.authorFilter}>
      <Select
        placeholder={placeholder}
        options={options}
        onChange={onFilterChange}
        size="compact"
        multiple={true}
        searchable={true}
      />
    </div>
  );
});
