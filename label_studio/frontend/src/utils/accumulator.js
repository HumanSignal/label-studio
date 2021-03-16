export const accumulator = (timeout, callback) => {
  const result = [];
  let timer = null;

  const initTimer = () => {
    timer = setTimeout(() => {
      callback([...result]);
      clearTimeout(timer);
      result.length = 0;
    }, timeout);
  };

  return (data) => {
    clearTimeout(timer);

    result.push(data);

    initTimer();
  };
};
