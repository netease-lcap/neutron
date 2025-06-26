export const delay = (time = 0) => {
  return new Promise((resolve) => {
    const callback = () => resolve(time);

    setTimeout(callback, time);
  });
};

export const loop = (callback, time = 300) => {
  let timer = -1;
  let end = false;

  const execute = async () => {
    await callback();

    timer && start();
  };

  const start = () => {
    timer = setTimeout(
      () => timer && execute(),
      time,
    );
  };

  execute();

  return () => {
    timer = undefined;
    clearTimeout(timer);
  };
};
