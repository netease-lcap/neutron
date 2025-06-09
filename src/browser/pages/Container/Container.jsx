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

import BabyForm from 'react-baby-form';

import { useEventCallback } from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';

import {
  isSecureSrc,
  isAvailableSrc,
  setToArray,
} from './tools';

import { useData, useCurrent } from './hooks';

import ContainerView from './ContainerView';
import ContainerFavicon from './ContainerFavicon';

const Container = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const inputRef = useRef(null);

  const [data = [], setData] = useData();
  const [current = {}, setCurrent] = useCurrent(data, setData);

  const [instance, setInstance] = useState();
  const [uselessSrc, setUselessSrc] = useState('');

  const {
    id,
    src = '',
    canGoBack,
    canGoForward,
  } = current;

  const cls = classnames({
    'components-container-render': true,
    [className]: !!className,
  });

  const beforeunload = useEventCallback(() => {
    const code = 'window.electron?.beforeunload?.()';

    return instance?.executeJavaScript(code);
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

  const onFocusSrc = useEventCallback((event) => {
    event.target?.select?.();
  });

  const onKeyDownSrc = useEventCallback(async (event) => {
    if (event?.which !== 13) {
      return;
    }

    const useful = src?.startsWith('http');
    const href = useful ? src : `https://${src}`;

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

  const renderHair = () => {
    const onClickAdd = () => {
      setCurrent({ active: true });
    };

    const items = data.map((item = {}) => {
      const {
        id: itemId,
        active,
        title,
        favicon,
      } = item;

      const itemCls = classnames({
        'tabs-item': true,
        active,
      });

      const onClikSelect = () => {
        const next = { ...item, active: true };

        setCurrent(next);
      };

      const onClickClose = (event) => {
        const filter = (current) => current?.id !== itemId;
        const filtered = data.filter(filter);

        event.stopPropagation();
        setData(filtered);
      };

      return (
        <div key={itemId} className={itemCls} onClick={onClikSelect}>
          <div className="item-prefix" />
          <div className="item-content">
            <ContainerFavicon className="favicon" src={favicon}>
              <Iconfont className="icon" name="public" />
            </ContainerFavicon>
            <div className="title">
              <span className="text">{ title }</span>
            </div>
            <div className="tool" onClick={onClickClose}>
              <Iconfont className="icon" name="close" />
            </div>
          </div>
          <div className="item-suffix" />
        </div>
      );
    });

    const addItem = (
      <div className="tabs-item special">
        <div className="item-content">
          <div className="tool tool-add" onClick={onClickAdd}>
            <Iconfont className="icon" name="add" />
          </div>
        </div>
      </div>
    );

    return (
      <div className="container-hair">
        <div className="hair-tabs">
          { items }
          { addItem }
        </div>
      </div>
    );
  };

  const renderHead = () => {
    const backCls = classnames({
      'operations-item': true,
      disabled: !canGoBack,
    });

    const forwardCls = classnames({
      'operations-item': true,
      disabled: !canGoForward,
    });

    const searchCls = classnames({
      'head-search': true,
      failed: src && uselessSrc === src,
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
        </div>
        <div className={searchCls}>
          <input
            className="search-input"
            type="text"
            spellCheck={false}
            ref={inputRef}
            onFocus={onFocusSrc}
            onKeyDown={onKeyDownSrc}
            _name="src"
          />
        </div>
      </div>
    );
  };

  const renderBody = () => {
    const items = data.map((item = {}) => {
      const { id: itemId, active } = item;

      const itemCls = classnames({
        'body-webview': true,
        active,
      });

      const find = (got) => got?.id === itemId;
      const setter = setToArray(setData, find);

      return (
        <ContainerView
          key={itemId}
          id={itemId}
          data={item}
          setData={setter}
          className={itemCls}
        />
      );
    });

    return (
      <div className="container-body">
        { items }
      </div>
    );
  };

  useLayoutEffect(() => {
    const { current } = inputRef;

    !src && current?.focus?.();
  });

  useEffect(() => {
    const element = document.getElementById(id);

    setInstance(element);
  }, [data, id]);

  useEffect(() => {
    const listener = (event = {}) => {
      const { detail = {} } = event;

      setCurrent({ active: true, ...detail });
    };

    document.addEventListener('create-tab', listener);
    return () => document.removeEventListener('create-tab', listener);
  }, [setCurrent]);

  return (
    <BabyForm
      ref={ref}
      className={cls}
      value={current}
      onChange={setCurrent}
      {...others}
    >
      { renderHair() }
      { renderHead() }
      { renderBody() }
    </BabyForm>
  );
});

export default Container;
