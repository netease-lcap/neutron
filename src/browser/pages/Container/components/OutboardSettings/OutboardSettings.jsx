import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useReducer,
  useCallback,
  useLayoutEffect,
  useImperativeHandle,
  useContext,
} from 'react';
import classnames from 'classnames';

import { useEventCallback } from '@/shared/hooks';

import { searchEngine } from '../../shared/tools';

import { useDangerSharedContext } from '../../shared/hooks';

const operations = [
  {
    key: 'searchEngine',
    title: '搜索引擎',
    descritpion: '您选择的搜索引擎将用于多种功能，例如从地址栏中进行搜索。',
    placeholder: '网址格式（用“%s”代替搜索字词）',
    tags: [
      { label: '必应', value: 'https://cn.bing.com/search?q=%s' },
      { label: '谷歌', value: 'https://www.google.com.hk/search?q=%s' },
      { label: '百度', value: 'https://www.baidu.com/s?wd=%s' },
    ],
    get: (...args) => searchEngine.get(...args),
    set: (...args) => searchEngine.set(...args),
  },
];

const OutboardSettings = React.forwardRef((props = {}, ref) => {
  const { className, children, ...others } = props;

  const [current, setCurrent] = useDangerSharedContext('current');
  const [context, setContext] = useDangerSharedContext('context');

  const [source = {}, setSource] = useState({});

  const { src } = current;
  const { settings: visible } = context;

  const cls = classnames({
    'components-outboard-settings-render': true,
    [className]: !!className,
    visible,
  });

  const getValueFromSource = useEventCallback((operation = {}) => {
    const { key, get: getter } = operation;
    const { [key]: saved } = source;

    const useless = saved === undefined;
    const value = useless ? getter() : saved;

    return value;
  });

  const setValueToSource = useEventCallback((operation = {}) => (value) => {
    const { key, set: setter } = operation;

    setter(value);
    setSource({ ...source, [key]: value });
  });

  const renderOperationTags = (operation = {}) => {
    const { tags = [] } = operation;

    const got = getValueFromSource(operation);
    const setter = setValueToSource(operation);

    return tags.map((item = {}, index) => {
      const { label, value } = item;

      const active = value === got;
      const tagCls = classnames({ tag: true, active });

      const onClick = () => setter(value);

      return (
        <div
          key={index}
          className={tagCls}
          onClick={onClick}
        >
          { label }
        </div>
      );
    });
  };

  const renderOperations = () => {
    return operations.map((operation = {}, index) => {
      const {
        title = '',
        descritpion = '',
        placeholder = '',
      } = operation;

      const value = getValueFromSource(operation);

      const onChange = (event = {}) => {
        const { target: { value } = {} } = event;

        setValueToSource(operation)(value);
      };

      return (
        <div className="settings-item" key={index}>
          <div className="item-main">
            <div className="main-title">
              { title }
            </div>
            <div className="main-description">
              { descritpion }
            </div>
          </div>
          <div className="item-rest">
            <div className="rest-input">
              <input
                type="text"
                className="input"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
              />
            </div>
            <div className="rest-tags">
              { renderOperationTags(operation) }
            </div>
          </div>
        </div>
      );
    });
  };

  useEffect(() => {
    const settings = false;
    const merged = { ...context, settings };

    setContext(merged);
  }, [src]);

  return (
    <div ref={ref} className={cls} {...others}>
      <div className="settings-content">
        { renderOperations() }
      </div>
    </div>
  );
});

export default OutboardSettings;
