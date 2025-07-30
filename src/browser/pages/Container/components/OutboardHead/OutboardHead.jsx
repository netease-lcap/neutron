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

import Popup from '@/components/Popup';
import Iconfont from '@/components/Iconfont';

import {
  isUsefulSrc,
  isSecureSrc,
  isAvailableSrc,
  isUsefulCurrent,
} from '../../shared/tools';
import { bookmarks } from '../../shared/local';

import { useDangerSharedContext } from '../../shared/hooks';

import Favicon from '../Favicon';
import Operation from '../Operation';

import OutboardFind from '../OutboardFind';

const useBookmark = () => {
  const [current] = useDangerSharedContext('current');

  const getter = useEventCallback(() => {
    return bookmarks.getBySrc(current?.src);
  }, [current]);

  const setter = useEventCallback((...args) => {
    return bookmarks.setBySrc(current?.src, ...args);
  });

  return bookmarks.use(getter, setter);
};

const Bookmark = (props = {}) => {
  const {
    className,
    current,
    close,
    ...others
  } = props;

  const inputRef = useRef(null);

  const [object = {}, setObject] = useState(current);
  const { src, title } = object;

  const cls = classnames({
    'head-bookmark': true,
    [className]: !!className,
  });

  const onKeyUp = useEventCallback((event = {}) => {
    const { which } = event;

    if (which !== 13) {
      return;
    }

    close?.();
    bookmarks.setBySrc(src, object);
  });

  const onChange = useEventCallback((event = {}) => {
    const { target: { value = '' } = {} } = event;

    setObject({ ...object, title: value });
  });

  const onClickRemove = useEventCallback(() => {
    close?.();
    bookmarks.delBySrc(src);
  });

  const onClickSubmit = useEventCallback(() => {
    close?.();
    bookmarks.setBySrc(src, object);
  });

  useEffect(() => {
    const { current } = inputRef;

    current?.select?.();
  }, [inputRef]);

  return (
    <div className={cls}>
      <div className="bookmark-info">
        <input
          type="text"
          className="input"
          ref={inputRef}
          value={title}
          onKeyUp={onKeyUp}
          onChange={onChange}
        />
      </div>
      <div className="bookmark-control">
        <div className="button dark" onClick={onClickRemove}>移除</div>
        <div className="button" onClick={onClickSubmit}>完成</div>
      </div>
    </div>
  );
};

const OutboardHead = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const inputRef = useRef(null);
  const [uselessSrc, setUselessSrc] = useState('');
  const [selected, setSelected] = useState({});
  const [completing, setCompleting] = useState(false);
  const [completions, setCompletions] = useState([]);
  const [bookmark, setBookmark] = useBookmark();

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

  const onClickBookmark = useEventCallback(() => {
    const { src, title, favicon } = current;

    !bookmark?.src && setBookmark({ src, title, favicon });
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
    const backDisabled = !canGoBack;
    const forwardDisabled = !canGoForward;

    return (
      <div className="head-operations">
        <Operation
          className="operations-item"
          name="arrow-back"
          disabled={backDisabled}
          onClick={onClickBack}
        />
        <Operation
          className="operations-item"
          name="arrow-forward"
          disabled={forwardDisabled}
          onClick={onClickForward}
        />
        <Operation
          className="operations-item"
          name="refresh"
          onClick={onClickRefresh}
        />
      </div>
    );
  };

  const renderHeadSuffixOperations = () => {
    return (
      <div className="head-operations">
        <Operation
          className="operations-item"
          name="settings"
          active={settingsVisible}
          onClick={onClickSettings}
        />
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

  const renderHeadSearchBookmark = () => {
    const useful = isUsefulCurrent(current);

    const active = !!bookmark?.src;
    const name = active ? 'star' : 'star-border';
    const render = (more = {}) => (<Bookmark current={bookmark} {...more} />);

    if (!useful) {
      return null;
    }

    return (
      <Popup
        poppedClassName="popped-bookmark"
        render={render}
      >
        <Operation
          className="search-bookmark"
          name={name}
          active={active}
          onClick={onClickBookmark}
        />
      </Popup>
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
        { renderHeadSearchBookmark() }
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
