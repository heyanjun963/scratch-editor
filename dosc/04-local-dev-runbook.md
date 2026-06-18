# 本地开发运行手册

这份文档记录当前 Windows + `fnm` 环境下跑起 `scratch-editor` 的步骤。

## Node 版本

仓库 `.nvmrc` 指定：

```text
24.16.0
```

使用 `fnm`：

```powershell
fnm install 24.16.0
fnm use 24.16.0
node -v
npm -v
```

如果在自动化命令或后台进程里不想依赖当前 shell 状态，可以使用：

```powershell
fnm exec --using=24.16.0 cmd /c npm -v
```

## 安装依赖

理想情况：

```powershell
npm ci
```

如果 `packages/scratch-gui/scripts/prepare.mjs` 下载 `scratch-microbit.hex.zip` 超时，可以先跳过 lifecycle scripts：

```powershell
npm ci --ignore-scripts
```

然后手动跑 prepare。当前机器上本地代理端口是 `127.0.0.1:7897`，Node 24 支持 `--use-env-proxy`：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
cd packages/scratch-gui
fnm exec --using=24.16.0 cmd /c node --use-env-proxy scripts/prepare.mjs
cd ..\..
```

prepare 成功后会生成：

- `packages/scratch-gui/static/microbit/scratch-microbit-1.2.0.hex`
- `packages/scratch-gui/src/generated/microbit-hex-url.cjs`

这些文件被 `.gitignore` 忽略，不需要提交。

## 构建内部依赖包

首次运行 GUI 前，建议构建 GUI 依赖的内部包：

```powershell
fnm exec --using=24.16.0 cmd /c npm run build --workspace @scratch/task-herder
fnm exec --using=24.16.0 cmd /c npm run build --workspace @scratch/scratch-storage
fnm exec --using=24.16.0 cmd /c npm run build --workspace @scratch/scratch-svg-renderer
fnm exec --using=24.16.0 cmd /c npm run build --workspace @scratch/scratch-render
fnm exec --using=24.16.0 cmd /c npm run build --workspace @scratch/scratch-vm
```

原因：`scratch-gui` 的 webpack 配置会读取这些包的 `dist/web` 产物。

## 启动 GUI

在仓库根目录运行：

```powershell
fnm exec --using=24.16.0 cmd /c npm start
```

访问：

```text
http://localhost:8601/
```

成功时 webpack 日志会出现：

```text
webpack 5.x compiled successfully
```

## 停止服务

如果是在当前终端前台运行，按 `Ctrl+C`。

如果是后台进程，可以按端口停止：

```powershell
$conns = Get-NetTCPConnection -LocalPort 8601 -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $conns) { Stop-Process -Id $conn.OwningProcess -Force }
```

## 常见问题

### `Cannot find module '@scratch/scratch-storage'`

通常是内部包还没有构建。先跑：

```powershell
npm run build --workspace @scratch/scratch-storage
```

如果还缺 `@scratch/scratch-vm`，继续构建 VM：

```powershell
npm run build --workspace @scratch/scratch-vm
```

### `scratch-microbit.hex.zip` 下载超时

`prepare.mjs` 使用 Node 内置 `fetch`。普通 npm proxy 不一定影响它。

在 Node 24 下使用：

```powershell
node --use-env-proxy scripts/prepare.mjs
```

并确保 `HTTP_PROXY` / `HTTPS_PROXY` 已设置。

### `canvas` 相关 warning

构建 `scratch-render` 或 `scratch-vm` 时可能看到 `Can't resolve 'canvas'` warning。当前验证中它没有阻止 dev server 启动。

### zh-cn 缺失翻译日志

浏览器控制台可能出现 `MISSING_TRANSLATION`。这表示某些文案回退到默认英文，不等同于启动失败。

## 不要提交的内容

这些通常是生成物或本地文件：

- `node_modules/`
- `packages/**/dist/`
- `packages/scratch-gui/src/generated/`
- `packages/scratch-gui/static/microbit/`
- `*.log`
- `.env*`

提交前运行：

```powershell
git status
git diff --cached
```

