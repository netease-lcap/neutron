# Neutron

Electron 搭建 CodeWave IDE 本地化应用：
* **解决内存泄漏：** Chrome 使用指定版本，解决浏览器版本变更导致的内存泄漏问题；
* **降低内存需求：** TS-Server 运行在 Node.js 环境，浏览器内存使用量降低 50% 以上；
* **解除内存限制：** 定制构建 Eletron 版本，重置内存上限：浏览器（16GB）、Node.js（32GB）；
* **落地前端服务：** 基于 Electron 内部 Node.js 运行前端服务，缓解服务器压力，现已验证通过 nasl-generator-fe。

### 本地开发
```
npm install
npm run start
```

### 构建产物
```
npm install
npm run make
```

### 特有功能

#### window.gc
```javascript
// 主动触发浏览器的垃圾回收
window?.gc?.();
```

#### window.electron.fetch
```javascript
// Node.js 环境发起接口请求，可以用于绕过浏览器跨域策略
window?.electron?.fetch?.(url);
```

#### window.electron.createWorker
```javascript
// 创建运行在 Node.js 环境下的 Worker
(async () => {
  const options = { name: 'node-worker' };

  const fetched = await fetch(link);
  const buffer = await fetched.arrayBuffer();

  window?.electron?.createWorker?.(buffer, options);
})();
```

#### window.electron.execCommands
```javascript
// 使用 Eletron 内置 Node.js 执行命令行
(async () => {
  // npm install 必须要指定全局 -g，不然 Worker 内部无法访问对应依赖
  await window?.electron?.execCommands?.('npm install pnpm -g');
  // npm install 必须要指定全局 -g，不然 Worker 内部无法访问对应依赖
  await window?.electron?.execCommands?.(['npm install pnpm -g']);
  // npm install 必须要指定全局 -g，不然 Worker 内部无法访问对应依赖
  await window?.electron?.execCommands?.(['npm install pnpm -g'], { encoding: 'utf8' });
})();
```

#### window.electron.print
```javascript
// url 是对应页面的完整路径
// 接口文档 https://www.electronjs.org/docs/latest/api/web-contents
window?.electron?.print?.(url, options, callback);
```

#### window.electron.printToPDF
```javascript
// url 是对应页面的完整路径
// 接口文档 https://www.electronjs.org/docs/latest/api/web-contents
window?.electron?.printToPDF?.(url, options); 
```
