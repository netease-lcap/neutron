const code = `
  console.log(222, typeof require);

  self.onmessage = (event) => {
    postMessage('Worker: '+ event.data);
  };
`;

const options = { type: 'application/javascript' };
const blob = new Blob([code], options);

// const url = URL.createObjectURL(blob);
// const worker = new Worker(url, { name: 'test' });

(async () => {
  const worker = electron.createWorker(await blob.arrayBuffer(), { name: 'test' });

  const listener = (event) => console.log(event.data);
  worker.addEventListener('message', listener);

  window.testWorker = worker;
})();
