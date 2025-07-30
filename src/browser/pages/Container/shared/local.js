import { createHandler } from './tools';

export const websiteConfigs = (() => {
  let value;

  const key = 'website_configs';
  const handler = createHandler(key, {});

  const getter = () => {
    value = value || handler.get();
    return value;
  };

  const setter = (current) => {
    value = current;

    return handler.set(current);
  };

  const getHostFromSrc = (src = '') => {
    const matched = src.match(/:\/\/[^\/]+(\/|$)/) || [];
    const [source = ''] = matched;

    return source?.replace?.(/(^:\/\/)|(\/$)/g, '');
  };

  const getBySrc = (src = '') => {
    const source = getter() || {};
    const host = getHostFromSrc(src);

    return source[host];
  };

  const setBySrc = (src = '', value = {}) => {
    const source = getter() || {};
    const host = getHostFromSrc(src);
    const merged = { ...source, [host]: value };

    return setter(merged);
  };

  const mergeBySrc = (src = '', more = {}) => {
    const got = getBySrc(src) || {};
    const current = { ...got, ...more };

    return setBySrc(src, current);
  };

  return {
    ...handler,
    get: getter,
    set: setter,
    getBySrc,
    setBySrc,
    mergeBySrc,
  };
})();

export const bookmarks = (() => {
  let value;

  const key = 'bookmarks';
  const handler = createHandler(key, []);

  const getter = () => {
    value = value || handler.get();
    return value;
  };

  const setter = (current) => {
    value = current;

    return handler.set(current);
  };

  const findBySrc = (src) => (item) => {
    return item?.src === src;
  };

  const getBySrc = (src = '') => {
    const source = getter() || [];
    const find = findBySrc(src);

    return source.find(find);
  };

  const setBySrc = (src = '', value = {}) => {
    const source = getter() || [];
    const got = getBySrc(src);

    let merged = source.slice();

    if (got) {
      merged = merged.map((item) => {
        const same = item === got;

        return same ? value : item;
      });
    } else {
      merged.push(value);
    }

    return setter(merged);
  };

  const mergeBySrc = (src = '', more = {}) => {
    const got = getBySrc(src) || {};
    const current = { ...got, ...more };

    return setBySrc(src, current);
  };

  const delBySrc = (src = '') => {
    const source = getter() || [];

    const find = findBySrc(src);
    const filter = (...args) => !find(...args);

    const merged = source.filter(filter);

    return setter(merged);
  };

  return {
    ...handler,
    get: getter,
    set: setter,
    getBySrc,
    setBySrc,
    mergeBySrc,
    delBySrc,
  };
})();