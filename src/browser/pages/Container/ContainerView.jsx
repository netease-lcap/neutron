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
import classnames from 'classnames';

import {
  useEventCallback,
  useLoopWhenWebViewReady,
} from '@/shared/hooks';

import WebView from '@/components/WebView';

const getFavicon = () => {
  const selector = 'link[rel*="icon"]';
  const selected = document.querySelector(selector);

  if (!selected.href) {
    return;
  }

  const url = new URL(selected.href);

  return url.href;
};

const ContainerView = React.forwardRef((props = {}, ref) => {
  ref = ref || useRef(null);

  const {
    className,
    data = {},
    setData = () => {},
    ...others
  } = props;

  const {
    src,
    title,
    httpreferrer,
  } = data;

  const cls = classnames({
    'components-container-view-render': true,
    [className]: !!className,
  });

  const onChangeSrc = useEventCallback((src) => {
    setData((prev) => ({ ...prev, src }));
  });

  useEffect(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    const listener = () => {
      const src = current.getURL();

      setData((prev = {}) => ({ ...prev, src }));
    };

    document.addEventListener('refresh-webview', listener);
    return () => document.removeEventListener('refresh-webview', listener);
  }, [ref]);

  useEffect(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    const listener = async () => {
      const source = getFavicon.toString();
      const favicon = await current.executeJavaScript(`(${source})()`);

      setData((prev = {}) => ({ ...prev, favicon }));
    };

    current.addEventListener('dom-ready', listener);
    return () => current.removeEventListener('dom-ready', listener);
  }, [ref]);

  useEffect(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    const listener = async (event = {}) => {
      const { favicons = [] } = event;
      const favicon = favicons[favicons.length - 1];

      favicon && setData((prev = {}) => ({ ...prev, favicon }));
    };

    current.addEventListener('page-favicon-updated', listener);
    return () => current.removeEventListener('page-favicon-updated', listener);
  }, [ref]);

  useLoopWhenWebViewReady(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    const title = current.getTitle();
    const canGoBack = current.canGoBack();
    const canGoForward = current.canGoForward();

    const object = { title, canGoBack, canGoForward };

    const setter = (prev) => {
      const every = (key) => object[key] === prev[key];

      const keys = Object.keys(object);
      const same = keys.every(every);

      return same ? prev : { ...prev, ...object };
    };

    setData(setter);
  }, ref);

  useEffect(() => {
    const code = 'window.electron?.beforeunload?.()';

    return () => ref?.current?.executeJavaScript(code);
  }, [ref]);

  return (
    <WebView
      allowpopups="true"
      ref={ref}
      src={src}
      className={cls}
      httpreferrer={httpreferrer}
      onChangeSrc={onChangeSrc}
      {...others}
    />
  );
});

export default ContainerView;
