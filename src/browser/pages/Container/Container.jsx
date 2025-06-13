import React, { useState, useEffect } from 'react';
import classnames from 'classnames';

import { useEventCallback } from '@/shared/hooks';

import {
  recorder,
  isUsefulSrc,
  isUsefulCurrent,
} from './shared/tools';

import {
  useData,
  useMemory,
  useCurrent,
  SharedContext,
  useDangerSharedProvided,
} from './shared/hooks';

import OutboardHair from './components/OutboardHair';
import OutboardHead from './components/OutboardHead';
import OutboardBody from './components/OutboardBody';
import OutboardTips from './components/OutboardTips';

const { Provider } = SharedContext;

const Container = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const [data = [], setData] = useData();
  const [memory = {}, setMemory] = useMemory();
  const [current = {}, setCurrent] = useCurrent(data, setData);

  const [tips = [], setTips] = useState([]);
  const [instance, setInstance] = useState();

  const { id } = current;

  const cls = classnames({
    'components-container-render': true,
    [className]: !!className,
  });

  const beforeunload = useEventCallback((webview = instance) => {
    const code = 'window.electron?.beforeunload?.()';

    try {
      const useful = webview?.src && webview?.getURL?.();

      return useful && webview?.executeJavaScript(code);
    } catch (error) {
      console.error(error);      
    }
  });

  const removeBySource = useEventCallback(async (source = current) => {
    const { id: sourceId, src }  = source;

    const element = document.getElementById(sourceId);
    const filter = (item) => item?.id !== sourceId;
    const filtered = data.filter(filter);
    const useful = isUsefulSrc(src);

    await beforeunload(element);
    
    useful && recorder.add(source);
    setData(filtered);
  });

  const onHandleTab = useEventCallback(async (event = {}) => {
    const { detail = {} } = event;
    const { type, state = {} } = detail;

    switch (type) {
      case 'add': {
        setCurrent({ active: true, ...state });

        break;
      }
      case 'close': {
        await removeBySource();
        break;
      }
      case 'recover': {
        const last = recorder.pop() || {};

        setCurrent({ ...last, active: true });
        break;
      }
    }
  });

  const provided = useDangerSharedProvided({
    beforeunload,
    removeBySource,
    data: [data, setData],
    memory: [memory, setMemory],
    current: [current, setCurrent],
    tips: [tips, setTips],
    instance: [instance, setInstance],
  });

  useEffect(() => {
    const element = document.getElementById(id);

    setInstance(element);
  }, [data, id]);

  useEffect(() => {
    const setter = (source = {}) => {
      const reduce = (result = {}, item = {}) => {
        const { src: itemSrc } = item;
        const { [itemSrc]: saved } = result;

        const same = saved === item;
        const more = { [itemSrc]: item };

        return same ? result : { ...result, ...more };
      };

      const reduced = data
        .filter(isUsefulCurrent)
        .reduce(reduce, source);

      return reduced;
    };

    setMemory(setter);
  }, [data.length, setMemory]);

  useEffect(() => {
    document.addEventListener('handle-tab', onHandleTab);
    return () => document.removeEventListener('handle-tab', onHandleTab);
  }, [onHandleTab]);

  return (
    <Provider value={provided}>
      <div ref={ref} className={cls} {...others}>
        <OutboardHair />
        <OutboardHead />
        <OutboardBody />
        <OutboardTips />
      </div>
    </Provider>
  );
});

export default Container;
