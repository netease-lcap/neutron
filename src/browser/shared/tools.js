export const loop = (callback, time = 300) => {
  let timer;

  const start = () => {
    callback();
    timer = setTimeout(start, time);
  };

  start();
  return () => clearTimeout(timer);
};
