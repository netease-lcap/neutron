import React from 'react';
import classnames from 'classnames';

import { setToArray } from '../../shared/tools';

import { useDangerSharedContext } from '../../shared/hooks';

import Website from '../Website';

const OutboardBody = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const [data = [], setData] = useDangerSharedContext('data');

  const cls = classnames({
    'components-outboard-body-render': true,
    [className]: !!className,
  });

  const items = data.map((item = {}) => {
    const { id, active } = item;

    const itemCls = classnames({
      'body-website': true,
      active,
    });

    const find = (got) => got?.id === id;
    const setter = setToArray(setData, find);

    return (
      <Website
        key={id}
        id={id}
        data={item}
        setData={setter}
        className={itemCls}
      />
    );
  });

  return (
    <div ref={ref} className={cls} {...others}>
      { items }
    </div>
  );
});

export default OutboardBody;
