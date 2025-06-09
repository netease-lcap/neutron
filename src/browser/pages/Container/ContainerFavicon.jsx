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

import { useFetch } from '@/shared/hooks';

const toBlobURL = async (href = '') => {
  try {
    const buffer = href && await electron?.fetchBuffer(href);
    const blob = buffer && new Blob([buffer]);

    return blob ? URL.createObjectURL(blob) : href;
  } catch (error) {
    console.error(error);
    return href;
  }
};

const ContainerFavicon = React.forwardRef((props = {}, ref) => {
  const {
    className,
    children,
    src,
    style: propsStyle,
    ...others
  } = props;

  const cls = classnames({
    'components-container-favicon-render': true,
    [className]: !!className,
  });

  const favicon = useFetch(() => toBlobURL(src), [src]);

  const style = useMemo(() => {
    if (!favicon) {
      return propsStyle;
    }

    const backgroundImage = `url(${favicon})`;

    return propsStyle
      ? { ...propsStyle, backgroundImage }
      : { backgroundImage };
  }, [favicon, propsStyle]);

  useEffect(() => {
    const matched = favicon?.startsWith('blob');

    return () => matched && URL.revokeObjectURL(favicon);
  }, [favicon]);

  return (
    <div ref={ref} className={cls} style={style} {...others}>
      { children }
    </div>
  );
});

export default ContainerFavicon;
