import React from 'react';
import classnames from 'classnames';

const Iconfont = React.forwardRef((props = {}, ref) => {
  const { className, name, ...others } = props;

  const cls = classnames({
    iconfont: true,
    [`icon-${name}`]: true,
    [className]: !!className,
  });

  return (
    <div ref={ref} className={cls} {...others} />
  );
});

export default Iconfont;
