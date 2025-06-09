import React, {
  memo,
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

import { useEventCallback } from '@/shared/hooks';

import {
  getKey,
  createHandler,
  setToArray,
} from './tools';

const KEY_DATA = '$$data';

const DEFAULTED = [
  {
    id: getKey(),
    active: true,
    canGoBack: false,
    canGoForward: false,
    title: 'CodeWave智能开发平台',
    src: 'https://codewave.163.com/',
  },
];

export const useData = () => {
  const handler = createHandler(KEY_DATA);
  const getter = () => handler.get() || DEFAULTED;

  const [value, setValue] = useState(getter);

  useEffect(() => {
    if (value?.length) {
      handler.set(value);
    } else {
      handler.remove();
      window.close();
    }
  }, [value]);

  useEffect(() => {
    if (!value?.length) {
      return;
    }

    const some = (item) => item?.active;
    const useful = value.some(some);

    if (useful) {
      return;
    }

    const source = value[value.length - 1] || {};
    const merged = { ...source, active: true };
    const prefix = value.slice(0, -1);
    const next = [...prefix, merged];

    setValue(next);
  }, [value]);

  return [value, setValue];
};

export const useCurrent = (source = [], setSource) => {
  const [id, setId] = useState(() => {
    const isActive = (item) => item?.active;
    const actived = source.find(isActive) || source[0];

    return actived?.id;
  });

  const find = useEventCallback(
    (item) => item?.id === id,
  );

  const current = useMemo(() => {
    return source.find(find) || {};
  }, [source, id]);

  const setCurrent = useEventCallback((...args) => {
    return setToArray(setSource, find)(...args);
  });

  useEffect(() => {
    const find = (item) => item?.active;
    const found = source?.find(find);

    found?.id && setId(found?.id);
  }, [source]);

  return [current, setCurrent];
};
