# Neutron

Electron 搭建 CodeWave IDE 本地化应用：
* **解决内存泄漏：** Chrome 使用 128 版本，解决高版本浏览器导致的内存泄漏问题；
* **降低内存需求：** TS-Server 运行在 Node.js 环境，浏览器内存使用量降低 50% 以上；
* **解除内存限制：** 定制构建 Eletron 版本，重置内存上限：浏览器（16GB）、Node.js（32GB）。

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
  const fetched = await fetch(link);
  const blob = await fetched.blob();
  const buffer = await blob.arrayBuffer();
  const options = { name: 'node-worker' };

  window?.electron?.createWorker?.(buffer, options);
})();
```

#### window.electron.execCommands
```javascript
// 使用 Eletron 内置 Node.js 执行命令行
(async () => {
  // npm install 必须要指定全局 -g，不然 Worker 内部无法访问对应依赖
  await window?.electron?.execCommands?.('npm install pnpm -g');
})();
```
