# 18 GitHub 产品拓展自动更新执行记录

> 本轮目标：从公开 GitHub 产品配置仓库读取已发布版本，下载并校验 SBEXT，保存最近一次有效版本，并保证断网重启后不回退到软件内置旧版本。

## 用户流程

```text
打开拓展库
  -> 后台只读 catalog.json
  -> 页面显示 GitHub 已发布版本
  -> 用户点击“检查版本”
  -> 对每个新版本显式确认
  -> 下载 SBEXT
  -> 校验 SHA256
  -> 解析并校验包内 id/version
  -> 保存离线缓存
  -> 已加载产品立即替换 VM 和 Python 模板
```

没有静默更新。目录或下载请求失败时，页面继续使用最近一次校验成功的缓存；不存在缓存时才使用随软件发布的内置默认包。

## GitHub 地址策略

浏览器实测结果：

| 地址 | Catalog | SBEXT | 结论 |
| - | - | - | - |
| `raw.githubusercontent.com` | 支持 CORS | 支持 CORS | 软件自动更新使用 |
| GitHub Release `browser_download_url` | 不适用 | 浏览器 CORS 拦截 | 只供用户手动下载 |
| GitHub Release API asset | 支持查询 | 跳转资产时 CORS 拦截 | 不作为浏览器下载入口 |

因此 catalog 使用双地址：

```json
{
  "downloadUrl": "https://raw.githubusercontent.com/.../main/dist/product-version.sbext",
  "releaseDownloadUrl": "https://github.com/.../releases/download/tag/product-version.sbext"
}
```

`downloadUrl` 供软件自动下载，`releaseDownloadUrl` 保留用户下载和 Release 版本追溯。

## 安全边界

远程数据必须依次通过：

1. catalog `formatVersion` 和 `published` 状态检查。
2. `packageId`、语义化版本、HTTPS 地址和 64 位 SHA256 格式检查。
3. 下载字节的 Web Crypto SHA256 校验。
4. 下载前后都执行 10 MiB 最大体积检查。
5. SBEXT 目录和 JSON schema 解析。
6. 包内 `manifest.id/version` 与 catalog 一致性检查。

任一检查失败都不会写入缓存，也不会替换当前 VM 拓展。

## 离线缓存

缓存键：

```text
scratchGui.remoteProductExtensionPackages.v1
```

缓存保存规范化 manifest、来源仓库、tag、asset、SHA256 和校验时间。Web 和 Electron 的 Chromium localStorage 都会落盘；同一产品的历史版本不会删除，为后续项目版本锁定预留恢复数据。

页面离线解析规则：

```text
remote-cache 与 bundled-default 比较版本
  -> 使用版本更高者
  -> 版本相同时优先 remote-cache
  -> remote-registry 占位卡片
```

卡片版本标签显示当前实际使用版本，不直接显示远程最新版本。远程新版本只在“检查版本”确认框中展示，避免卡片显示 `0.2.2`、确认框却把当前版本写成 `0.2.1`。

## 变更文件

| 文件 | 职责 | 结论 |
| - | - | - |
| `remote-library-client.js` | catalog、semver、下载和 SHA256 | 只返回 published 且校验通过的数据 |
| `remote-library-cache.js` | 历史版本缓存和离线恢复 | 保留多版本，当前使用最高有效版本 |
| `library-sources.js` | 合并 catalog、缓存和内置包 | 远程版本用于提示，缓存 manifest 用于离线运行 |
| `product-extension-library.jsx` | 启动检查、手动确认、更新和热替换 | 不静默更新；远程新产品可下载后加载 |
| `sync-product-extensions.mjs` | 生成 catalog 双下载地址 | Raw 自动下载与 Release 手动下载分开 |
| `remote-library-client.test.js` | 远程边界测试 | 覆盖 semver、published 过滤、哈希成功和拒绝 |
| `remote-library-cache.test.js` | 缓存测试 | 覆盖多版本持久化和最高版本恢复 |
| `product-extension-library.test.jsx` | 页面更新测试 | 覆盖确认、下载、解析和写入缓存 |

## 验证结果

```text
远程客户端、缓存、来源模型和页面测试
  4 suites / 16 tests 通过

本轮全部拓展库相关回归
  7 suites / 21 tests 通过

webpack dev server
  编译成功

真实公开 catalog
  HTTP 200，页面提示当前 0.2.1 已是最新版本

模拟 0.3.0 完整浏览器更新
  confirm -> fetch -> SHA256 -> JSZip -> cache 通过

模拟断网刷新
  仍显示 remote-cache 0.3.0，没有回退 bundled-default 0.2.1
```

## GitHub 仓库待推送

`D:\code\scratch-product-extensions` 当前有两处本地改动：

- `product-extension-registry.json`：新增 `packageDownloadBaseUrl`。
- `catalog.json`：`downloadUrl` 改为 Raw 地址，新增 `releaseDownloadUrl`。

发布下一个产品版本前必须先提交并推送这两处改动。

## 剩余工作

1. 项目文件记录产品拓展 `id/version/source/tag/sha256`。
2. 加载旧项目时按锁定版本选择历史缓存。
3. 缓存体积增长后迁移 IndexedDB 或 Electron 独立文件缓存。
4. 增加更新日志和兼容版本展示，不只显示版本号。
5. 真机产品测试后验证远程包生成的 Python 与串口上传链路。
