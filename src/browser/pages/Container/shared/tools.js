import { useState, useEffect } from 'react';

import debounce from 'lodash/debounce';

import { useEventCallback } from '@/shared/hooks';

const storage = {
  get: (...args) => {
    const source = window.localStorage.getItem(...args);

    try {
      return source && JSON.parse(source);
    } catch (error) {
      console.error(error);
    }
  },
  set: debounce((...args) => {
    const [key, source, ...rest] = args;
    const json = JSON.stringify(source);

    window.localStorage.setItem(key, json, ...rest);
  }, 300),
  remove: debounce((...args) => {
    window.localStorage.removeItem(...args);
  }, 300),
};

export const createHandler = (key, defaulted) => {
  let callbacks = [];

  const off = (callback) => {
    callbacks = callbacks.filter(
      (item) => item !== callback,
    );
  };

  const on = (callback) => {
    callbacks = callbacks
      .concat(callback)
      .filter(Boolean);

    return () => off(callback);
  };

  const remove = (...args) => storage.remove(key, ...args);

  const getter = (...args) => storage.get(key, ...args) || defaulted;

  const setter = (...args) => {
    const forEach = (c) => c?.(...args);

    callbacks.forEach(forEach);
    return storage.set(key, ...args);
  };

  const use = (getState = getter, setState = setter) => {
    const [current, setCurrent] = useState(getState);

    const refresh = useEventCallback(
      () => setCurrent(getState()),
    );

    useEffect(refresh, [getState]);
    useEffect(() => on(refresh), [refresh]);

    return [current, setState];
  };

  return {
    on,
    off,
    use,
    remove,
    get: getter,
    set: setter,
  };
};

export const isSecureSrc = async (src = '') => {
  const options = { method: 'HEAD' };

  try {
    await window.electron.fetch(src, options);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const isAvailableSrc = (src = '') => {
  const httpSrc = src.replace(/^https:\/\//, 'http://');
  const options = { method: 'HEAD' };

  return isSecureSrc(httpSrc, options);
};

export const isUsefulSrc = (src = '') => {
  try {
    new URL(src);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const isUsefulCurrent = (current = {}) => {
  const { src, title, favicon } = current;

  return title && favicon && isUsefulSrc(src);
};

export const getUsefulCurrent = (current = {}) => {
  const { usedJSHeapSize, ...others } = current;

  return others;
};

export const getKey = () => `${Date.now()}`;

export const setToArray = (setArray = () => {}, find = () => {}) => (next) => {
  const handlers = [
    (result = []) => (current = {}) => {
      const isActive = (item) => item.active;
      const some = (item) => item?.id === current?.id;
      const map = (item) => some(item) ? current : item;

      const inclued = result.some(some);

      if (inclued) {
        return result.map(map);
      }

      const index = result.findIndex(isActive);
      const sliced = result.slice();
      const matched = index > -1 && current?.src;

      matched
        ? sliced.splice(index + 1, 0, current)
        : sliced.push(current);

      return sliced;
    },
    (result = []) => (current = {}) => {
      const { active } = current;

      const more = { active: false };

      const some = (item) => item?.id === current?.id;
      const map = (item) => some(item) ? current : { ...item, ...more };

      if (!active) {
        return result;
      }

      return active ? result.map(map) : result;
    },
  ];

  const setter = (source = []) => {
    const found = source.find(find);

    const functional = typeof next === 'function';
    const basic = functional ? next(found) : next;

    if (!basic) {
      return source;
    }

    const current = basic?.id ? basic : { id: getKey(), ...basic };
    const handler = (result, handler) => handler(result)(current) || result;

    return found === current
      ? source
      : handlers.reduce(handler, source);
  };

  setArray(setter);
};

export const recorder = (() => {
  const records = [];

  const add = (current = {}) => {
    if (!current?.src) {
      return;
    }

    const got = getUsefulCurrent(current);

    records.push(got);
  };

  const pop = (current = {}) => {
    return records.pop();
  };

  return { add, pop };
})();

const ONE_KB = 1024;
const ONE_MB = 1024 * ONE_KB;
const ONE_GB = 1024 * ONE_MB;

export const toFloat = (number = 0, digits = 2) => {
  const float = number.toFixed(digits);

  return Number(float);
};

export const toGB = (size = 0) => {
  const number = size / ONE_GB;

  return toFloat(number);
};
