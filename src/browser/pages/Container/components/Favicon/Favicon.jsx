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

import Iconfont from '@/components/Iconfont';

import { isUsefulSrc } from '../../shared/tools';

const toBlobURL = async (src = '') => {
  try {
    const useful = isUsefulSrc(src);

    return useful
      ? electron?.createObjectURLByUrl?.(src)
      : src;
  } catch (error) {
    console.error(error);
    return src;
  }
};

const Favicon = React.forwardRef((props = {}, ref) => {
  const {
    className,
    src,
    style: propsStyle,
    ...others
  } = props;

  const cls = classnames({
    'components-favicon-render': true,
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
      <Iconfont className="icon" name="public" />
    </div>
  );
});

export default Favicon;
