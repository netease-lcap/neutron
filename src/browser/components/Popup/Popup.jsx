import React, {
  useRef,
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';

import { useEventCallback } from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';

const stop = (e) => e.stopPropagation();

const Popup = React.forwardRef((props = {}, ref) => {
  ref = ref || useRef();

  const {
    className,
    children,
    render,
    closable,
    poppedClassName,
    onClick: propsOnClick,
    ...others
  } = props;

  const [visible, setVisible] = useState(null);

  const cls = classnames({
    'components-popup-render': true,
    [className]: !!className,
  });

  const close = useEventCallback(() => {
    setVisible(false);
  });

  const onClick = useEventCallback((event) => {
    setVisible(!visible);
    propsOnClick?.(event);
  });

  const onClickClosable = useEventCallback(() => {
    close();
  });

  const onMouseLeave = useEventCallback((event) => {
    const { target } = event;

    const callback = () => {
      const hovered = target?.matches?.(':hover');

      !hovered && setVisible(false);
    };

    setTimeout(callback, 500);
  });

  const renderChildren = () => {
    return children;
  };

  const renderPoppedContent = () => {
    return (
      <div className="popped-content">
        { render?.({ close }) || null }
      </div>
    );
  };

  const renderPoppedClosable = () => {
    if (!closable) {
      return null;
    }

    return (
      <div className="popped-closable" onClick={onClickClosable}>
        <Iconfont className="icon" name="close" />
      </div>
    );
  };

  const renderPopped = () => {
    const poppedCls = classnames({
      'popup-popped': true,
      [poppedClassName]: !!poppedClassName,
    });

    if (!visible) {
      return null;
    }

    return (
      <div
        className={poppedCls}
        onClick={stop}
        onMouseLeave={onMouseLeave}
      >
        { renderPoppedClosable() }
        { renderPoppedContent() }
      </div>
    );
  };

  return (
    <div ref={ref} className={cls} onClick={onClick} {...others}>
      { renderChildren() }
      { renderPopped() }
    </div>
  );
});

export default Popup;
