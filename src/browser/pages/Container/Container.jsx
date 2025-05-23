import React, {
  memo,
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
import qs from 'qs';
import classnames from 'classnames';
import debounce from 'lodash/debounce';

import BabyForm from 'react-baby-form';

import {
  useEventCallback,
  useLoopWhenWebViewReady,
} from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';
import WebView from '@/components/WebView';

const KEY_HOME_SRC = '$$home-src';
const KEY_LAST_SRC = '$$last-src';
const DEFAULT_HOME_SRC = 'https://codewave.163.com/';

const storage = {
  get: (...args) => window.localStorage.getItem(...args),
  set: debounce((...args) => window.localStorage.setItem(...args), 300),
};

const createHandler = (key) => ({
  get: (...args) => storage.get(key, ...args),
  set: (...args) => storage.set(key, ...args),
});

const getSrcFromSearch = () => {
  const { location: { search = '' } = {} } = window;

  const options = { ignoreQueryPrefix: true };
  const query = qs.parse(search, options) || {};
  const { src = '' } = query;

  return window.decodeURIComponent(src);
};

const useData = () => {
  const homeSrcHandler = createHandler(KEY_HOME_SRC);
  const lastSrcHandler = createHandler(KEY_LAST_SRC);

  const src = getSrcFromSearch()
    || lastSrcHandler.get()
    || homeSrcHandler.get()
    || DEFAULT_HOME_SRC;

  const [value, setValue] = useState({
    src,
    homeSrc: src,
    canGoBack: false,
    canGoForward: false,
    title: 'CodeWave智能开发平台',
  });

  useEffect(
    () => lastSrcHandler.set(value.src),
    [value.src],
  );

  useEffect(
    () => homeSrcHandler.set(value.homeSrc || DEFAULT_HOME_SRC),
    [value.homeSrc],
  );

  return [value, setValue];
};

const Container = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const webviewRef = useRef(null);
  const [data = {}, setData] = useData();
  const [uselessSrc, setUselessSrc] = useState('');
  const {
    src,
    title,
    homeSrc,
    canGoBack,
    canGoForward,
  } = data;

  const cls = classnames({
    'components-container-render': true,
    [className]: !!className,
  });

  const onClickBack = useEventCallback(() => {
    webviewRef?.current?.goBack?.();
  }, [webviewRef]);

  const onClickForward = useEventCallback(() => {
    webviewRef?.current?.goForward?.();
  }, [webviewRef]);

  const onClickRefresh = useEventCallback(() => {
    webviewRef?.current?.reload?.();
  }, [webviewRef]);

  const onClickHome = useEventCallback(() => {
    setData((prev = {}) => {
      const { src: prevSrc, homeSrc: prevHomeSrc } = prev;

      const same = prevSrc === prevHomeSrc;
      const nextHomeSrc = same ? DEFAULT_HOME_SRC : prevSrc;

      return { ...prev, homeSrc: nextHomeSrc };
    });
  }, [webviewRef]);

  const onFocusSrc = useEventCallback((event) => {
    event.target?.select?.();
  });

  const onKeyDownSrc = useEventCallback(async (event) => {
    if (event?.which !== 13) {
      return;
    }

    try {
      const options = { method: 'HEAD' };
      await window.electron.fetch(src, options);

      webviewRef.current?.loadURL?.(src);
      setUselessSrc(null);
    } catch (error) {
      setUselessSrc(src);
    }
  });

  const onChangeSrc = useEventCallback((src) => {
    setData((prev) => ({ ...prev, src }));
  });

  const renderHead = () => {
    const backCls = classnames({
      'operations-item': true,
      disabled: !canGoBack,
    });

    const forwardCls = classnames({
      'operations-item': true,
      disabled: !canGoForward,
    });

    const homeCls = classnames({
      'operations-item': true,
      active: src === homeSrc,
    });

    const searchCls = classnames({
      'head-search': true,
      failed: uselessSrc === src,
    });

    return (
      <div className="container-head">
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
          <div className={homeCls} onClick={onClickHome}>
            <Iconfont className="icon" name="home" />
          </div>
        </div>
        <div className={searchCls}>
          <input
            className="search-input"
            type="text"
            spellCheck={false}
            onFocus={onFocusSrc}
            onKeyDown={onKeyDownSrc}
            _name="src"
          />
        </div>
      </div>
    );
  };

  const renderBody = () => {
    return (
      <div className="container-body">
        <WebView
          allowpopups="true"
          className="body-webview"
          ref={webviewRef}
          src={src}
          onChangeSrc={onChangeSrc}
        />
      </div>
    );
  };

  useEffect(() => {
    if (document.title === title) {
      return;
    }

    document.title = title;
  }, [title]);

  useEffect(() => {
    const { current } = webviewRef;

    if (!current) {
      return;
    }

    const listener = () => {
      const src = current.getURL();

      setData((prev = {}) => ({ ...prev, src }));
    };

    document.addEventListener('refresh-webview', listener);
    return () => document.removeEventListener('refresh-webview', listener);
  }, [webviewRef]);

  useLoopWhenWebViewReady(() => {
    const { current } = webviewRef;

    if (!current) {
      return;
    }

    const title = current.getTitle();
    const canGoBack = current.canGoBack();
    const canGoForward = current.canGoForward();

    setData((prev) => ({
      ...prev,
      title,
      canGoBack,
      canGoForward,
    }));
  }, webviewRef);

  return (
    <BabyForm
      ref={ref}
      className={cls}
      value={data}
      onChange={setData}
      {...others}
    >
      { renderHead() }
      { renderBody() }
    </BabyForm>
  );
});

export default Container;
