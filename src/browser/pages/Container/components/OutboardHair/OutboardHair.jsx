import React from 'react';
import classnames from 'classnames';

import { useEventCallback } from '@/shared/hooks';

import Iconfont from '@/components/Iconfont';

import { toGB } from '../../shared/tools';

import { useDangerSharedContext } from '../../shared/hooks';

import Favicon from '../Favicon';

const OutboardHair = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const [data = [], setData] = useDangerSharedContext('data');
  const [current = [], setCurrent] = useDangerSharedContext('current');

  const removeBySource = useDangerSharedContext('removeBySource');

  const cls = classnames({
    'components-outboard-hair-render': true,
    [className]: !!className,
  });

  const onClickAdd = useEventCallback(() => {
    setCurrent({ active: true });
  });

  const renderItemSizeNode = (item = {}) => {
    const { usedJSHeapSize = 0 } = item;

    const size = toGB(usedJSHeapSize);

    if (size < 1) {
      return null;
    }

    const warning = size < 2;
    const danger = size >= 2;

    const sizeCls = classnames({
      size: true,
      danger,
      warning,
    });

    return (
      <span className={sizeCls}>
        { size }
      </span>
    );
  };

  const items = data.map((item = {}) => {
    const {
      id,
      title,
      active,
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

    const onClickClose = async (event) => {
      event.stopPropagation();

      await removeBySource(item);
    };

    return (
      <div key={id} className={itemCls} onClick={onClikSelect}>
        <div className="item-prefix" />
        <div className="item-content">
          <Favicon className="favicon" src={favicon} />
          <div className="title">
            <span className="text">{ title }</span>
          </div>
          { renderItemSizeNode(item) }
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
    <div ref={ref} className={cls} {...others}>
      <div className="hair-tabs">
        { items }
        { addItem }
      </div>
    </div>
  );
});

export default OutboardHair;
