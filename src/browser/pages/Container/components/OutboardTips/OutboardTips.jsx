import React, { useEffect } from 'react';
import classnames from 'classnames';

import { useEventCallback } from '@/shared/hooks';

import { useDangerSharedContext } from '../../shared/hooks';

const OutboardTips = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const [tips = [], setTips] = useDangerSharedContext('tips');
  const [data = [], setData] = useDangerSharedContext('data');
  const [current = {}, setCurrent] = useDangerSharedContext('current');

  const cls = classnames({
    'components-outboard-tips-render': true,
    [className]: !!className,
  });

  const addTip = useEventCallback((current) => {
    const filter = (item) => item !== current;

    setTips((prev = []) => prev.concat(current));

    setTimeout(() => {
      setTips((prev = []) => prev.filter(filter));
    }, 3000);
  });

  const items = tips.map((item = {}, index) => {
    const {
      type,
      title = '',
      description = '',
    } = item;

    const itemCls = classnames({
      'tips-item': true,
      [type]: !!type,
    });

    return (
      <div key={index} className={itemCls}>
        <div className="title">{ title }</div>
        <div className="description">{ description }</div>
      </div>
    );
  });

  useEffect(() => {
    if (data.length <= 10) {
      return;
    }

    const tip = {
      type: 'warning',
      title: '标签页过多',
      description: '请关闭无用标签页，降低内存消耗。',
    };

    addTip(tip);
  }, [data.length]);

  return (
    <div ref={ref} className={cls} {...others}>
      { items }
    </div>
  );
});

export default OutboardTips;
