import { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Block, Elem } from '../../utils/bem';
import { ReactComponent as IconSend } from '../../assets/icons/send.svg';
import { IconCross } from '../../assets/icons';
import { SpinnerCircle } from '../SpinnerCircle/SpinnerCircle';

import './Assistant.styl';
import { TextArea } from '../../common/TextArea/TextArea';

export const Assistant: FC<{ onPrompt: (prompt: string) => void, awaitingSuggestions: boolean }> = observer(({ onPrompt, awaitingSuggestions }) => {
  const [historyValue, setHistoryValue] = useState<string[]>([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    const _history = JSON.parse(window.localStorage.getItem('llm_assistant') || '[]');

    if (_history.length) {
      setHistoryValue(_history);
      setValue(historyValue[0]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('llm_assistant', JSON.stringify(historyValue));
  }, [historyValue]);

  const setHistory = useCallback((text: string) => {
    const _history = [...historyValue];

    _history.forEach((item: string, index: number) => {
      if (item === text) {
        _history.splice(index, 1);
      }
    });

    _history.unshift(text);

    if (_history.length > 5) {
      _history.pop();
    }

    setHistoryValue(_history);
  }, [historyValue]);


  const onSubmit = useCallback((e) => {
    e?.preventDefault?.();

    if (!value.trim()) return;

    onPrompt(value);

    setHistory(value);
  }, [value]);

  const setValueFromHistory = useCallback((item: string) => {
    setValue(item);
    onPrompt(item);
    setHistory(item);
  }, [historyValue]);

  const deleteValueFromHistory = useCallback((deleteItem: string) => {
    const _history = [...historyValue];

    _history.forEach((item: string, index: number) => {
      if (item === deleteItem) {
        _history.splice(index, 1);
      }
    });

    setHistoryValue(_history);
  }, [historyValue]);

  const renderHistory = () => {
    return historyValue.map((item: string, index: number) => {
      return (
        <Elem tag="div" name="history-item" key={index} onClick={() => setValueFromHistory(item)}>
          {item}
          <Elem tag="div" name="history-item-delete" onClick={(e:MouseEvent) => {
            e.stopPropagation();
            deleteValueFromHistory(item);
          }}>
            <IconCross />
          </Elem>
        </Elem>
      );
    });
  };

  return (
    <Block name="assistant">
      <Block tag="form" name="assist-form" mod={{ inline: true, loading: awaitingSuggestions }} onSubmit={onSubmit}>
        <TextArea
          className={awaitingSuggestions ? 'lsf-assist-form_disabled' : ''}
          name="assist-text"
          placeholder="Type your message here"
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
        />
        <Elem tag="div" name="primary-action"
          mod={{ loading: awaitingSuggestions }}
        >
          <button type="submit">
            <Elem name='icon' tag={awaitingSuggestions ? SpinnerCircle : IconSend} width={24} height={24}/>
          </button>
        </Elem>
      </Block>
      <Elem tag="div" name="history">
        {historyValue.length > 0 && renderHistory()}
      </Elem>
    </Block>
  );
});
