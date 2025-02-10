export const loop = (callback, time = 100) => {
  let timer;

  const start = () => {
    callback();
    timer = setTimeout(start, time);
  };

  start();
  return () => clearTimeout(timer);
};
