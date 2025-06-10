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
  createContext,
} from 'react';

import { useEventCallback } from '@/shared/hooks';

import {
  getKey,
  createHandler,
  setToArray,
} from './tools';

const KEY_DATA = '$$data';
const KEY_MEMORY = '$$memory';

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
    const filter = (item) => item?.title
      && item?.src?.startsWith('http');

    const source = value.filter(filter);

    if (source?.length) {
      handler.set(source);
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

const toMemory = (source = []) => {
  return source.reduce((result = {}, item = {}) => {
    const { src } = item;

    return { ...result, [src]: item };
  }, {})
};

export const useMemory = () => {
  const handler = createHandler(KEY_MEMORY);

  const getter = () => toMemory(
    handler.get() || [],
  );

  const [value, setValue] = useState(getter);

  useEffect(() => {
    const values = Object.values(value);
    const sliced = values.length > 50
      ? values.slice(-50)
      : values;

    handler.set(sliced);
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

export const SharedContext = createContext({});

export const useDangerSharedContext = (attribute = '') => {
  const context = useContext(SharedContext);

  if (attribute) {
    return useMemo(() => {
      return context?.[attribute];
    }, [context, attribute]);
  }

  return context;
};

export const useDangerSharedProvided = (source = {}) => {
  const [provided, setProvided] = useState({});

  const entries = Object.entries(source);

  const forEach = (entry = []) => {
    const [key, value] = entry;
    const arraied = Array.isArray(value);
    const array = arraied ? value : [value];

    const setter = (prev) => ({ ...prev, [key]: value });

    useMemo(
      () => setProvided(setter),
      [setProvided, key, ...array],
    );
  };

  entries.forEach(forEach);

  return provided;
};
