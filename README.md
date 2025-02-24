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
