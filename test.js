const vm = require('node:vm');
const { wrap } = require('module')

const Worker = require('web-worker');

const code = `
  self.onmessage = (event) => {
    console.log(222, typeof require);
    debugger;

    postMessage('Worker: '+ event.data);
  };
`;

const options = { type: 'application/javascript' };
const blob = new Blob([code], options);

const delay = (time) => new Promise((resolve) => {
  setTimeout(resolve, time);
});

(async () => {
  const source = await blob.arrayBuffer();

  const code = Buffer.from(source).toString('base64');
  const url = `data:application/javascript;base64,${code}`;

  const worker = new Worker(url, {
    type: 'commonJs',
  });

  console.log(worker);
  global.testWorker = worker;
})();

