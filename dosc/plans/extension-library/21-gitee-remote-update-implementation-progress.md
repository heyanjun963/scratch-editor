# 21 Gitee 产品拓展自动更新执行记录

> 本轮目标：让桌面端优先从 Gitee 公开产品仓库读取 catalog 和 SBEXT，并在 Gitee 不可用或文件校验失败时回退到现有 GitHub Raw 来源。

## 实现结论

桌面端远程更新顺序已经调整为：

```text
Gitee Contents catalog
  -> Gitee Contents dist/<asset>
  -> GitHub Raw downloadUrl 备用
  -> 已校验离线缓存
  -> 软件内置默认包
```

不需要修改 VM、积木注册、Python 生成或 Electron 主进程。Gitee API 在浏览器请求携带 `Origin` 时允许跨域，GUI Renderer 可以直接请求。

现有 catalog 格式保持不变。客户端读取 Gitee catalog 后，根据每个条目的 `asset` 构造 `dist/<asset>` Contents 路径，并把原有 `downloadUrl` 作为 GitHub 备用源。旧版软件仍可继续使用原来的 GitHub 字段。

## 真实仓库验证

验证仓库：`wdadsd/scratch-product-extensions`

验证 Release：`aimecanum-v0.2.2`

| 项目 | 结果 |
| - | - |
| Gitee main | `91433b6237c841513bcd852fddf8b738ae7e6a5b` |
| Release tag | `aimecanum-v0.2.2` |
| Release 目标提交 | `61c2558fa4ca4455dd4fffb1cfba8eade7fa476d` |
| catalog Contents API | HTTP 200，Base64，原文件 782 字节 |
| SBEXT Contents API | HTTP 200，Base64，解码后 6427 字节 |
| Release asset | `aimecanum-0.2.2.sbext`，最终响应为 `application/zip` |
| 未认证限额 | 响应头为 60 次/小时 |
| Chromium CORS | 从 `http://127.0.0.1:8601` 请求 catalog 和 SBEXT 均为 HTTP 200 |

Release API 和 Contents API 带浏览器 `Origin` 时返回 `Access-Control-Allow-Origin: *`。Release 下载入口的首个 302 响应没有 CORS 头，最终附件响应虽然允许跨域，仍不作为自动更新入口。

## 代码改动

| 文件 | 职责 | 本轮结论 |
| - | - | - |
| `remote-library-client.js` | Gitee Contents 解码、目录/包双源回退、SHA256 | Gitee 主源失败后尝试 GitHub；所有来源失败才向页面报错 |
| `product-extension-library.jsx` | 安装远程包并写入缓存 | 使用下载客户端返回的实际来源，不再把 Gitee 下载误记为 GitHub |
| `remote-library-cache.js` | 远程包离线元数据 | 保存 `provider`、`repository`、`resolvedDownloadUrl` 和 `resolvedSourceType` |
| `remote-library-client.test.js` | 远程来源边界测试 | 覆盖 Gitee catalog、包解码、目录回退、哈希失败后的包回退 |
| `product-extension-library.test.jsx` | 页面安装缓存测试 | 验证 Gitee 来源被正确持久化 |

## 安全和失败规则

1. Gitee 仓库和 Contents 路径必须通过结构校验，并只允许 HTTPS。
2. catalog Base64 解码后最大为 1 MiB。
3. SBEXT Base64 解码前检查 API `size`，解码后再次执行 10 MiB 上限。
4. 每个来源的字节都必须单独通过 catalog SHA256，失败字节不会进入包解析或缓存。
5. Gitee 包哈希失败时可以尝试 GitHub 的同版本文件；只有校验成功的来源会被记录。
6. 包内 `manifest.id/version` 仍由页面与 catalog 再次对比。
7. 所有网络来源失败时，页面继续使用已校验缓存或软件内置包。

## 自动测试

```text
remote-library-client.test.js
  10 tests 通过

product-extension-library.test.jsx
  4 tests 通过

远程客户端、缓存、来源合并、页面和同步脚本回归
  5 suites / 23 tests 通过

webpack dev server
  编译成功，http://127.0.0.1:8601 返回 HTTP 200

Playwright Chromium 真实跨域验证
  catalog 0.2.2 / SBEXT 6427 bytes / SHA256 匹配
```

测试环境仍报告项目已有的 duplicate manual mock 和 Browserslist 过期警告，本轮没有修改这些全局问题。目标 ESLint 因当前 `node_modules` 缺少 `unrs-resolver` 可选原生绑定而未能启动；没有删除依赖或重新安装。

## 人工验收步骤

1. 启动桌面端，打开产品拓展库。
2. 在 DevTools Network 中确认 catalog 请求指向 Gitee Contents API。
3. 当前内置版本低于 `0.2.2` 时点击“检查版本”并确认更新。
4. 确认 SBEXT 请求指向 Gitee `dist/aimecanum-0.2.2.sbext` Contents API。
5. 更新成功后检查卡片版本和积木内容，并生成一次 Python 代码。
6. 断网重启桌面端，确认仍使用缓存的 `0.2.2`，不回退到内置旧版本。
7. 临时阻断 `gitee.com` 后重新检查，确认 GitHub Raw 备用源可以完成目录和包下载。

真机硬件行为仍按产品测试流程单独验收；本轮只改变远程包来源，不改变包内积木和上传协议。

## 0.2.3 双源闭环测试

为了验证新版桌面端能发现高于本地的版本，已基于产品仓库 `0.2.2` 生成只提升版本号的 `0.2.3` 测试包。该包保留 59 个积木、`wait_seconds` 积木和 `time.sleep({SECONDS})` Python 模板。

| 项目 | 值 |
| - | - |
| 产品仓库提交 | `0feaebd` |
| Git tag | `aimecanum-v0.2.3` |
| Release 文件 | `aimecanum-0.2.3.sbext` |
| 文件大小 | 6462 字节 |
| SHA256 | `5905fdb2236e57604123c586f50060a829bde7d16254b7aac5d28a5b936e07e1` |
| catalog 状态 | `published` |
| 开放 catalog 提交 | `3d8c2b1` |

提交、tag 和文件已经推送到 GitHub、Gitee。两个 Release 的 `0.2.3` 附件均为 6462 字节，SHA256 都与 catalog 一致；两个公开 catalog 均返回 `0.2.3 / published`。真实 Chromium 从本地 GUI 页面跨域读取 Gitee catalog 后，能够得到 `aimecanum 0.2.3` 可更新条目。

GitHub 的 `0.2.3` Release 目前还包含一个多余的 `aimecanum-0.2.2.sbext`，客户端不会读取该附件，但应从 Release 页面删除，避免人工下载时选错文件。

本轮同时发现编辑器内置产品源仍是 `0.2.1`，而产品仓库已是 `0.2.2/0.2.3`。当前同步命令可能使用旧内置源覆盖云端产品，后续必须增加禁止版本降级的保护，并明确云端产品源回写内置快照的流程。
