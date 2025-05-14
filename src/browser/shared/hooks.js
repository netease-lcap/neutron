import {
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';

import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

import { loop } from './tools';

export const useEventCallback = (callback, dependencies = []) => {
  const ref = useRef();

  ref.current = callback;

  return useCallback((...args) => {
    return ref?.current?.(...args);
  }, [ref]);
};

const useEventArgument = (arg) => {
  const keys = Object.keys(arg);
  const values = Object.values(arg);

  const objective = typeof arg === 'object';
  const dependencies = objective ? [...keys, ...values] : [arg];

  return useMemo(() => arg, dependencies);
};

const useEventArguments = (...args) => args.map(useEventArgument);

export const useDebounceCallback = (callback, ...args) => {
  args = useEventArguments(...args);
  callback = useEventCallback(callback);
  callback = useMemo(() => debounce(callback, ...args), args);

  return useCallback(callback, [callback]);
};

export const useThrottleCallback = (callback, ...args) => {
  args = useEventArguments(...args);
  callback = useEventCallback(callback);
  callback = useMemo(() => throttle(callback, ...args), args);

  return useCallback(callback, [callback]);
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
