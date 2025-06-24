export const delay = (time = 0) => {
  return new Promise((resolve) => {
    const callback = () => resolve(time);

    setTimeout(callback, time);
  });
};

export const loop = (callback, time = 300) => {
  let timer;

  const start = async () => {
    await callback();
    timer = setTimeout(start, time);
  };

  start();
  return () => clearTimeout(timer);
};
