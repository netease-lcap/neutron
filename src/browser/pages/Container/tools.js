import debounce from 'lodash/debounce';

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

export const createHandler = (key) => ({
  get: (...args) => storage.get(key, ...args),
  set: (...args) => storage.set(key, ...args),
  remove: (...args) => storage.remove(key, ...args),
});

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

export const getKey = () => `${Date.now()}`;

export const setToArray = (setArray = () => {}, find = () => {}) => (next) => {
  const handlers = [
    (result = []) => (current = {}) => {
      const some = (item) => item?.id === current?.id;
      const map = (item) => some(item) ? current : item;

      return result.some(some)
        ? result.map(map)
        : result.concat(current);
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
    const current = basic?.id ? basic : { id: getKey(), ...basic };

    const handler = (result, handler) => handler(result)(current) || result;

    return found === current
      ? source
      : handlers.reduce(handler, source);
  };

  setArray(setter);
};