import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
} from 'react';
import classnames from 'classnames';

import {
  useEventCallback,
  useDebounceCallback,
} from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';
import {
  isUsefulSrc,
  isSecureSrc,
  isAvailableSrc,
} from '../../shared/tools';

import { useDangerSharedContext } from '../../shared/hooks';

import Favicon from '../Favicon';

import OutboardFind from '../OutboardFind';

const OutboardHead = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const inputRef = useRef(null);
  const [uselessSrc, setUselessSrc] = useState('');
  const [selected, setSelected] = useState({});
  const [completing, setCompleting] = useState(false);
  const [completions, setCompletions] = useState([]);

  const [memory = {}, setMemory] = useDangerSharedContext('memory');
  const [instance, setInstance] = useDangerSharedContext('instance');
  const [current = {}, setCurrent] = useDangerSharedContext('current');
  const [context = {}, setContext] = useDangerSharedContext('context');
  const [settings = {}, setSettings] = useDangerSharedContext('settings');

  const beforeunload = useDangerSharedContext('beforeunload');

  const {
    id,
    src = '',
    canGoBack,
    canGoForward,
  } = current;

  const { searchEngine = '' } = settings;
  const { settingsVisible = false } = context;

  const cls = classnames({
    'components-outboard-head-render': true,
    [className]: !!className,
  });

  const onClickBack = useEventCallback(async () => {
    await beforeunload();
    instance?.goBack?.();
  }, [instance]);

  const onClickForward = useEventCallback(async() => {
    await beforeunload();
    instance?.goForward?.();
  }, [instance]);

  const onClickRefresh = useEventCallback(async () => {
    await beforeunload();
    instance?.reload?.();
  }, [instance]);

  const onClickSettings = useEventCallback(() => {
    const value = !settingsVisible;
    const merged = { ...context, settingsVisible: value };

    setContext(merged);
  });

  const onBlurSrc = useEventCallback((event) => {
    setCompleting(false);
  });

  const onFocusSrc = useEventCallback((event) => {
    event.target?.select?.();
  });

  const onChangeSrc = useEventCallback((event) => {
    const { target: { value = '' } = {} } = event;

    setCurrent((prev) => ({ ...prev, src: value }));
  });

  const syncToCurrent = useEventCallback((source = {}) => {
    const { id, favicon, title, ...rest } = source;

    setCurrent((prev) => ({ ...prev, ...rest }));
  });

  const selectByOffset = useEventCallback((offset = 0) => {
    const findIndex = (item = {}) => item?.src === selected?.src;
    const index = completions.findIndex(findIndex);
    const { length } = completions;

    if (!length) {
      return;
    }

    const combined = index + offset;
    const changed = (combined + length) % length;
    const next = completions[changed];

    next && setSelected(next);
    next && syncToCurrent(next);
  });

  const refreshCompletions = useEventCallback(() => {
    const faker = { src, title: '搜索内容' };
    const merged = { [src]: faker, ...memory };

    const hrefs = Object.keys(merged);

    const map = (key) => merged[key];
    const filter = (item) => item?.includes?.(src);

    const sort = (a = '', b = '') => {
      const aIndex = a.indexOf(src);
      const bIndex = b.indexOf(src);

      return aIndex < bIndex ? -1 : 1;
    };

    const source = hrefs.filter(filter).sort(sort);
    const sliced = source.slice(0, 8);
    const mapped = sliced.map(map);

    setCompletions(mapped);
  });

  const reload = useEventCallback(async () => {
    setCompleting(false);

    const useful = isUsefulSrc(src);
    const replaced = searchEngine.replace('%s', src);
    const defaulted = replaced || `https://${src}`;
    const href = useful ? src : defaulted;

    !useful && setCurrent((prev) => ({ ...prev, src: href }));

    const secure = await isSecureSrc(href);
    const avaliable = await isAvailableSrc(href);

    const uselessSrc = secure ? null : href;

    setUselessSrc(uselessSrc);

    if (!avaliable) {
      return;
    }

    if (!instance?.src) {
      instance.src = href;
      return;
    }

    const url = instance.getURL();
    const same = url === href;

    await beforeunload();

    same
      ? instance?.reload?.()
      : instance?.loadURL?.(href);
  });

  const triggerByInput = useDebounceCallback((value = '') => {
    setCompleting(!!value);
    refreshCompletions();
  });

  const onKeyUpSrc = useEventCallback((event = {}) => {
    const {
      which,
      key = '',
      target: { value } = {},
    } = event;

    switch (which) {
      // 回车
      case 13:
        break;
      // 上
      case 38: {
        selectByOffset(-1);
        break;
      }
      // 下
      case 40: {
        selectByOffset(1);
        break;
      }
      default: {
        if (key?.length !== 1) {
          return;
        }

        triggerByInput(value);
        break;
      }
    }
  });

  const onKeyDownSrc = useEventCallback((event) => {
    if (event?.which !== 13) {
      return;
    }

    return reload();
  });

  const onCompositionEnd = useEventCallback((event) => {
    const { target: { value } = {} } = event;

    triggerByInput(value);
  });

  const renderHeadPrefixOperations = () => {
    const backCls = classnames({
      'operations-item': true,
      disabled: !canGoBack,
    });

    const forwardCls = classnames({
      'operations-item': true,
      disabled: !canGoForward,
    });

    return (
      <div className="head-operations">
        <div className={backCls} onClick={onClickBack}>
          <Iconfont className="icon" name="arrow-back" />
        </div>
        <div className={forwardCls} onClick={onClickForward}>
          <Iconfont className="icon" name="arrow-forward" />
        </div>
        <div className="operations-item" onClick={onClickRefresh}>
          <Iconfont className="icon" name="refresh" />
        </div>
      </div>
    );
  };

  const renderHeadSuffixOperations = () => {
    const settingsCls = classnames({
      'operations-item': true,
      active: settingsVisible,
    });

    return (
      <div className="head-operations">
        <div className={settingsCls} onClick={onClickSettings}>
          <Iconfont className="icon" name="settings" />
        </div>
      </div>
    );
  };

  const renderHeadSearchInput = () => {
    return (
      <input
        className="search-input"
        type="text"
        spellCheck={false}
        value={src}
        ref={inputRef}
        onBlur={onBlurSrc}
        onFocus={onFocusSrc}
        onKeyUp={onKeyUpSrc}
        onChange={onChangeSrc}
        onKeyDown={onKeyDownSrc}
        onCompositionEnd={onCompositionEnd}
      />
    );
  };

  const renderHeadSearchCompletions = () => {
    if (!completing || !src) {
      return null;
    }

    if (!completions?.length) {
      return null;
    }

    const items = completions.map((item = {}, index) => {
      const { id, ...rest } = item;
      const { src, title, favicon } = rest;

      const itemCls = classnames({
        'completions-item': true,
        active: selected?.src === src,
      });

      const onMouseDownItem = (event) => {
        syncToCurrent(item);
        setTimeout(() => reload());
      };

      return (
        <div key={src} className={itemCls} onMouseDownCapture={onMouseDownItem}>
          <Favicon className="favicon" src={favicon} />
          <div className="title">{ title }</div>
          <div className="src">{ src }</div>
        </div>
      );
    });

    return (
      <div className="search-completions">
        { items }
      </div>
    );
  };

  const renderHeadSearchFind = () => {
    return (
      <OutboardFind className="search-find" />
    );
  };

  const renderHeadSearch = () => {
    const searchCls = classnames({
      'head-search': true,
      failed: src && uselessSrc === src,
      completing,
    });

    return (
      <div className={searchCls}>
        { renderHeadSearchInput() }
        { renderHeadSearchCompletions() }
        { renderHeadSearchFind() }
      </div>
    );
  };

  useLayoutEffect(() => {
    const { current } = inputRef;

    !src && current?.focus?.();
  });

  useEffect(() => {
    setCompleting(false);
  }, [id]);

  useEffect(() => {
    if (completing) {
      return;
    }

    setSelected();
    setCompletions([]);
  }, [completing, setSelected]);

  useEffect(() => {
    if (!completing) {
      return;
    }

    setSelected((prev) => {
      const some = (item) => item.src === prev?.src;
      const included = completions.some(some);
      const [first = {}] = completions;

      return included ? prev : first;
    });
  }, [completing, completions, setSelected]);

  return (
    <div ref={ref} className={cls} {...others}>
      { renderHeadPrefixOperations() }
      { renderHeadSearch() }
      { renderHeadSuffixOperations() }
    </div>
  );
});

export default OutboardHead;
