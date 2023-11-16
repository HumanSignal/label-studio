import { observer } from 'mobx-react';
import { useCallback, useMemo } from 'react';
import { Select } from '../../../common/Select/Select';
import ColorScheme from 'pleasejs';
import Utils from '../../../utils';
import styles from './Paragraphs.module.scss';

const AuthorTag = ({ name, selected }) => {
  const itemStyle = { border: `2px solid ${Utils.Colors.convertToRGBA(ColorScheme.make_color({ seed: name })[0])}` };

  return <span className={[styles.authorFilter__select__item, selected && styles.authorFilter__select__item_selected].join(' ')} style={itemStyle}>{name}</span>;
};

const renderMultipleSelected = (selected) => {
  if (selected.length === 0) return null;

  return (
    <div className={styles.authorFilter__select}>
      {selected.map((name) => (<AuthorTag key={name} name={name} />))}
    </div>
  );
};

export const AuthorFilter = observer(({ item, onChange }) => {
  const placeholder = useMemo(() => (<span className={styles.authorFilter__placeholder}>Show all authors</span>), []);
  const value = item.filterByAuthor;
  const options = useMemo(() => item._value.reduce((all, v) => all.includes(v[item.namekey]) ? all : [...all, v[item.namekey]], []).sort(), [item._value, item.namekey]);
  const filteredOptions = item.searchAuthor ? options.filter(o => o.toLowerCase().includes(item.searchAuthor.toLowerCase())) : options;
  const onFilterChange = useCallback((next) => {
    // ensure this is cleared if any action promoting an empty value change is made
    if (!next || next?.includes(null)) {
      item.setAuthorFilter([]);
    } else {
      item.setAuthorFilter(next);
    }

    onChange?.();
  }, [item.setAuthorFilter]);

  return (
    <div className={styles.authorFilter}>
      <Select
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={onFilterChange}
        renderMultipleSelected={renderMultipleSelected}
        size="compact"
        variant="rounded"
        surface="emphasis"
        multiple
      >
        <div className={styles.authorFilter__search}>
          <input
            autoComplete="off"
            className={styles.authorFilter__search__input}
            name="search_author"
            placeholder="Search"
            onInput={(e) => item.setAuthorSearch(e.target.value)}
          />
        </div>
        <Select.Option value={null} key="showAllAuthors" exclude>
          <span className={styles.authorFilter__showall}>Show all authors</span>
        </Select.Option>
        {filteredOptions.map(name => (
          <Select.Option value={name} key={name}>
            <AuthorTag name={name} selected={false} />
          </Select.Option>
        ))}
      </Select>
    </div>
  );
});
