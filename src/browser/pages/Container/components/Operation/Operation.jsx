import React from 'react';
import classnames from 'classnames';

import Iconfont from '@/components/Iconfont';

const Operation = React.forwardRef((props = {}, ref) => {
  const {
    className,
    name,
    active,
    disabled,
    ...others
  } = props;

  const cls = classnames({
    'components-operation-render': true,
    [className]: !!className,
    disabled,
    active,
  });

  return (
    <div ref={ref} className={cls} {...others}>
      <Iconfont className="icon" name={name} />
    </div>
  );
});

export default Operation;
