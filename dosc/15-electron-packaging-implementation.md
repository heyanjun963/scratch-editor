# Electron 生产打包实施记录

## 目标

本阶段目标是把桌面端从“开发运行”推进到“可以生成本地桌面产物”。

第一版不追求正式商用品质，只解决：

- 有生产构建命令。
- Electron 能加载本地 `scratch-gui` build 产物。
- 能生成 Windows unpacked 目录。
- 能生成 Windows 安装包配置。

## 新增命令

根目录新增：

```json
{
  "scripts": {
    "desktop:build": "cross-env NODE_ENV=production npm run desktop:build:gui",
    "desktop:build:gui": "node desktop/build-gui.js",
    "desktop:clean": "node desktop/clean-dist.js",
    "desktop:pack": "npm run desktop:clean && npm run desktop:build && electron-builder --config electron-builder.yml --dir",
    "desktop:dist": "npm run desktop:clean && npm run desktop:build && electron-builder --config electron-builder.yml"
  }
}
```

命令含义：

| 命令 | 作用 |
| - | - |
| `npm run desktop:build` | 构建桌面端需要的 `scratch-gui/build` |
| `npm run desktop:clean` | 清理 `desktop-dist` 旧产物 |
| `npm run desktop:pack` | 生成 unpacked 桌面目录，适合快速测试 |
| `npm run desktop:dist` | 生成安装包，适合交付测试 |

这里没有直接复用 `@scratch/scratch-gui` 的 `build:dev` 脚本，因为该脚本使用 Unix 风格环境变量：

```text
BUILD_TYPE=dev webpack
```

Windows 下会报 `'BUILD_TYPE' is not recognized`。因此新增 `desktop/build-gui.js`，在 Node 脚本里设置环境变量后直接调用 webpack。

## 新增配置

新增：

```text
electron-builder.yml
```

第一版配置：

- `productName`: `Scratch Editor`
- `appId`: `com.company.scratch-editor`
- 输出目录：`desktop-dist`
- 打包文件：
  - `desktop/**/*`
  - `packages/scratch-gui/build/**/*`
  - `package.json`
- Windows target：
  - `nsis`
  - `dir`

## 当前边界

第一版还没有做：

- 正式公司图标。
- 代码签名。
- 自动更新。
- macOS notarization。
- Linux 安装包验证。
- 打包后 E2E 自动测试。
- 本机 Python、Terminal、项目保存。

## 当前验证结果

本阶段已验证：

```powershell
npm run desktop:build
```

结果：

- 构建成功。
- 生成 `packages/scratch-gui/build/index.html`。
- webpack 有资源体积 warning，暂不阻断。

也已验证：

```powershell
node_modules\.bin\electron-builder.cmd --config electron-builder.yml --dir
```

结果：

- 生成 `desktop-dist/win-unpacked/Scratch Editor.exe`。
- 当前 exe 约 216 MB。
- electron-builder 提示当前使用默认 Electron 图标，后续需要替换公司图标。

注意：

```powershell
npm run desktop:pack
```

会先重新执行 `desktop:build`，因此耗时较长。Scratch GUI 的 webpack 生产构建在本机大约需要数分钟。

## 人工测试清单

### 1. 生成 unpacked 目录

```powershell
npm run desktop:pack
```

期望：

```text
desktop-dist/win-unpacked/
desktop-dist/win-unpacked/Scratch Editor.exe
```

### 2. 启动打包产物

打开：

```text
desktop-dist/win-unpacked/Scratch Editor.exe
```

期望：

- 能打开桌面窗口。
- 默认显示首页。
- 顶部标签栏正常。

### 3. 创建模式

测试：

- 点击“默认舞台模式”。
- 点击 `+` 回首页。
- 点击“代码模式”。

期望：

- 舞台模式显示默认 Scratch 舞台。
- 代码模式显示 Python 代码区和控制台区。
- 两个 Tab 可切换。

### 4. 关闭行为

测试：

- 关闭所有 Tab。

期望：

- 不自动新建默认项目。
- 回到首页。

## 如果失败，优先看这里

### 打开后白屏

优先检查：

- `packages/scratch-gui/build/index.html` 是否存在。
- DevTools console 是否有资源路径 404。
- `desktop/main.js` 生产模式是否加载了正确 file URL。

### 打包时报下载错误

可能是 Electron 或 builder 依赖下载被网络阻断。

处理：

- 配置 npm / Electron 下载代理。
- 复用本机 Electron 缓存。
- 后续公司内网应提供依赖缓存。

### 安装包太大

第一版会比较大，这是 Electron 的正常代价。

后续优化：

- 检查 build 产物是否包含 source map。
- 检查是否重复打包资源。
- 检查是否需要 asarUnpack。

## 本轮白屏问题记录

### 现象

`desktop-dist/win-unpacked/Scratch Editor.exe` 可以打开首页，但点击“默认舞台模式”或“代码模式”创建编辑器后，编辑器区域白屏。

### 根因 1：打包环境被误判为开发环境

原判断是：

```js
const isDevelopment = process.env.NODE_ENV !== 'production';
```

打包后的 exe 启动时不一定会带 `NODE_ENV=production`，所以 packaged 应用仍可能被误判为开发模式。

误判后，编辑器 Tab 会尝试加载：

```text
http://127.0.0.1:8601/
```

打包产物里没有 dev server，所以新建编辑器白屏。

修复：

```js
const isDevelopment = !app.isPackaged && process.env.NODE_ENV !== 'production';
```

以后判断 Electron 是否为打包产物，优先使用 `app.isPackaged`。

### 根因 2：打包后资源路径不能只依赖 `__dirname`

开发环境里 `__dirname` 指向源码目录：

```text
D:\code\scratch-editor\desktop
```

打包后代码位于：

```text
desktop-dist/win-unpacked/resources/app.asar/desktop
```

如果继续用开发期相对路径拼：

```js
path.join(__dirname, '..', 'packages', 'scratch-gui', 'build', 'index.html')
```

在 packaged 环境里容易得到错误路径。

修复后，生产资源统一基于：

```js
app.getAppPath()
```

例如：

```js
path.join(app.getAppPath(), 'packages', 'scratch-gui', 'build', 'index.html')
path.join(app.getAppPath(), 'desktop', 'home', 'index.html')
```

### 增加的排错信息

给编辑器 `WebContentsView` 增加了 `did-fail-load` 监听：

```js
view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    tab.loading = false;
    tab.crashed = true;
    tab.crashReason = `${errorCode}: ${errorDescription}`;
    console.error('[desktop-main] Editor failed to load', validatedURL, tab.crashReason);
    broadcastTabsChanged();
});
```

后续如果再次出现白屏，优先看：

- 终端里的 `[desktop-main] Editor failed to load`。
- DevTools console。
- 打包后 `resources/app.asar` 内是否包含目标文件。

### 本轮最终验证

已重新执行：

```powershell
node desktop/clean-dist.js
node_modules\.bin\electron-builder.cmd --config electron-builder.yml --dir
```

已生成：

```text
desktop-dist/win-unpacked/Scratch Editor.exe
```

人工验证结果：

- 首页可以打开。
- 点击“默认舞台模式”不再白屏。
- 点击“代码模式”不再白屏。
