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

import { delay } from '@/shared/tools';

import {
  useEventCallback,
  useLoopWhenWebViewReady,
} from '@/shared/hooks';

import WebView from '@/components/WebView';

import { isUsefulCurrent } from '../../shared/tools';

import { websiteConfigs } from '../../shared/local';

const getFavicon = () => {
  const selector = 'link[rel*="icon"]';
  const selected = document.querySelector(selector);

  if (!selected.href) {
    return;
  }

  const url = new URL(selected.href);

  return url.href;
};

const Website = React.forwardRef((props = {}, ref) => {
  ref = ref || useRef(null);

  const {
    className,
    data = {},
    setData: propsSetData = () => {},
    webpreferences: propsWebpreferences = '',
    ...others
  } = props;

  const {
    src,
    title,
    httpreferrer,
  } = data;

  const cls = classnames({
    'components-website-render': true,
    [className]: !!className,
  });

  const [zoomFactor, setZoomFactor] = useState(1);
  const [usedJSHeapSize, setUsedJSHeapSize] = useState(0);

  const setData = useEventCallback((source) => {
    const functional = typeof source === 'function';
    const callback = (prev) => prev?.id && source?.(prev);
    const target = functional ? callback : source;

    propsSetData?.(target);
  });

  const onChangeSrc = useEventCallback((src) => {
    setData((prev) => ({ ...prev, src }));
  });

  const webpreferences = useMemo(() => {
    const config = websiteConfigs.getBySrc(src) || {};
    const { zoomFactor = 1 } = config;

    const part = `zoomFactor=${zoomFactor}`;
    const parts = [part, propsWebpreferences];
    const merged = parts.filter(Boolean).join(',');

    return merged;
  }, [src, propsWebpreferences]);

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

  useEffect(() => {
    const { current } = ref;

    if (!current?.ready) {
      return;
    }

    const url = current.getURL();
    const zoomFactor = current.getZoomFactor();

    websiteConfigs.mergeBySrc(url, { zoomFactor });
  }, [zoomFactor]);

  useLoopWhenWebViewReady(async () => {
    const { current } = ref;

    const useful = isUsefulCurrent(data);

    if (!current || !useful) {
      return;
    }

    {
      const number = current?.getZoomFactor?.() || 1;
      const useful = number !== zoomFactor;

      useful && setZoomFactor(number);
    }

    {
      const code = `new Promise((resolve) => {
        const callback = () => resolve(performance.memory.usedJSHeapSize);
        const timeout = requestIdleCallback || setTimeout;

        timeout(callback);
      })`;

      const number = await current?.executeJavaScript?.(code) || 0;
      const unit = 1024 * 1024 * 10;
      const more = number % unit;
      const size = number - more;

      setUsedJSHeapSize(size);
    }

    await delay(1000 * 5);
  }, ref);

  useLoopWhenWebViewReady(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    const title = current.getTitle();
    const canGoBack = current.canGoBack();
    const canGoForward = current.canGoForward();

    const object = {
      title,
      canGoBack,
      canGoForward,
      usedJSHeapSize,
    };

    const callback = (prev = {}) => {
      const every = (key) => object[key] === prev[key];

      const keys = Object.keys(object);
      const same = keys.every(every);

      return same ? prev : { ...prev, ...object };
    };

    setData(callback);
  }, ref);

  return (
    <WebView
      allowpopups="true"
      ref={ref}
      src={src}
      className={cls}
      httpreferrer={httpreferrer}
      webpreferences={webpreferences}
      onChangeSrc={onChangeSrc}
      {...others}
    />
  );
});

export default Website;
