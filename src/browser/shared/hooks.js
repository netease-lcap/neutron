import {
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';

import { loop } from './tools';

export const useEventCallback = (callback, dependencies = []) => {
  const ref = useRef();

  ref.current = callback;

  return useCallback((...args) => {
    return ref?.current?.(...args);
  }, [ref]);
};

export const useLoopWhenWebViewReady = (callback, ref) => {
  const statbleCallback = useEventCallback(
    (...args) => callback?.(...args),
  );

  useEffect(() => {
    const { current } = ref;

    if (!current) {
      return;
    }

    let effect;

    const listener = () => {
      effect = loop(statbleCallback);
    };

    current.addEventListener('dom-ready', listener);
    return () => effect && effect();
  }, [ref, statbleCallback]);
};
