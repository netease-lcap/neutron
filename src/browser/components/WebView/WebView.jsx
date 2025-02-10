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
  useLoopWhenWebViewReady,
} from '@/shared/hooks';

const WebView = React.forwardRef((props = {}, ref) => {
  ref = ref || useRef();

  const {
    className,
    src,
    onChangeSrc: propsOnChangeSrc,
    ...others
  } = props;

  const cls = classnames({
    'components-web-view-render': true,
    [className]: !!className,
  });

  const [initialSrc] = useState(src);
  const [previousSrc, setPreviousSrc] = useState(src);

  const onChangeSrc = useEventCallback((...args) => {
    return propsOnChangeSrc?.(...args);
  }, [propsOnChangeSrc]);

  useEffect(() => {
    if (src === previousSrc) {
      return;
    }

    onChangeSrc(previousSrc);
  }, [previousSrc]);

  useLoopWhenWebViewReady(() => {
    const got = ref?.current?.getURL?.();

    setPreviousSrc(got);
  }, ref);

  return (
    <webview
      ref={ref}
      className={cls}
      src={initialSrc}
      {...others}
    />
  );
});

export default WebView;
