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

import {
  useEventCallback,
  useDebounceCallback,
} from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';

import { useDangerSharedContext } from '../../shared/hooks';

const OutboardFind = React.forwardRef((props = {}, ref) => {
  const { className, children, ...others } = props;

  const [current = {}] = useDangerSharedContext('current');
  const [instance, setInstance] = useDangerSharedContext('instance');

  const { id } = current;

  const input = useRef(null);

  const [limit, setLimit] = useState(0);
  const [index, setIndex] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [visible, setVisible] = useState(false);

  const cls = classnames({
    'components-outboard-find-render': true,
    [className]: !!className,
    visible
  });

  const find = useEventCallback((options = {}) => {
    const merger = { findNext: true, ...options };

    keyword && instance?.findInPage?.(keyword, options);
  });

  const onHandleFind = useEventCallback((event = {}) => {
    const detail = event?.detail;
    const { activeMatchOrdinal = 0, matches = 0 } = detail || {};

    setVisible(true);
    setLimit(matches);
    setIndex(activeMatchOrdinal);

    if (keyword && !detail) {
      input?.current?.focus?.();
      input?.current?.select?.();
    }
  });

  const onKeyDownGlobal = useEventCallback((event = {}) => {
    if (event?.which !== 27) {
      return;
    }

    setVisible(false);
  });

  const onChangeKeyword = useEventCallback((event = {}) => {
    const { target = {} } = event;
    const { value = '' } = target;

    setKeyword(value);
  });

  const onKeyDownKeyword = useEventCallback((event = {}) => {
    if (event?.which !== 13) {
      return;
    }

    find();
  });

  const onClickBackward = useEventCallback(() => {
    find({ forward: false });
  });

  const onClickForward = useEventCallback(() => {
    find();
  });

  const onClickClose = useEventCallback(() => {
    setVisible(false);
  });

  const keywordEffect = useDebounceCallback(() => {
    if (!instance?.ready) {
      return;
    }

    instance?.stopFindInPage?.('clearSelection');
    visible && find();
  }, 300);

  const renderSearchInput = () => {
    return (
      <input
        type="text"
        className="search-input"
        spellCheck="false"
        ref={input}
        value={keyword}
        onChange={onChangeKeyword}
        onKeyDown={onKeyDownKeyword}
      />
    );
  };

  const renderSearchNumber = () => {
    if (!keyword) {
      return null;
    }

    return (
      <span className="search-number">
        { index }/{ limit }
      </span>
    );
  };

  const renderSearch = () => {
    return (
      <div className="find-search">
        { renderSearchInput() }
        { renderSearchNumber() }
      </div>
    );
  };

  const renderTools = () => {
    const upCls = classnames({
      'tools-item': true,
      disabled: !keyword || !limit,
    });

    const downCls = classnames({
      'tools-item': true,
      disabled: !keyword || !limit,
    });

    return (
      <div className="find-tools">
        <div className={upCls}>
          <Iconfont
            className="icon"
            name="keyboard-arrow-up"
            onClick={onClickBackward}
          />
        </div>
        <div className={downCls}>
          <Iconfont
            className="icon offset"
            name="keyboard-arrow-down"
            onClick={onClickForward}
          />
        </div>
        <div className="tools-item">
          <Iconfont
            className="icon"
            name="close"
            onClick={onClickClose}
          />
        </div>
      </div>
    );
  };

  useEffect(keywordEffect, [instance, keyword]);

  useEffect(() => {
    setVisible(false);
  }, [id]);

  useEffect(() => {
    if (visible) {
      input?.current?.focus?.();
      find();
    } else {
      input?.current?.select?.();
    }
  }, [visible]);

  useEffect(() => {
    document.addEventListener('handle-find', onHandleFind);
    return () => document.removeEventListener('show-find', onHandleFind);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDownGlobal);
    return () => document.removeEventListener('keydown', onKeyDownGlobal);
  }, []);

  return (
    <div ref={ref} className={cls} {...others}>
      { renderSearch() }
      { renderTools() }
    </div>
  );
});

export default OutboardFind;
