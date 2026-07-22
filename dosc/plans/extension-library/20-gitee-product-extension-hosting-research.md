# 20 Gitee 产品积木托管调研与接入方案

> 调研目标：把产品积木配置和 `.sbext` 包托管到国内 Gitee 公开仓库，让桌面端具备与当前 GitHub 方案一致的版本发现、下载、校验、更新和离线使用能力。

## 结论

推荐继续使用“公开总仓库 + `catalog.json` + `.sbext`”模型，不为每个产品单独请求 Gitee Release：

1. Gitee 仓库保存 `catalog.json`、产品源配置和 `dist/*.sbext`。
2. 桌面端通过 Gitee API v5 的 Contents 接口读取 `catalog.json`。
3. 当前产品包体积较小时，也通过 Contents 接口读取 `.sbext` 的 Base64 内容。
4. 下载后继续执行现有 SHA256、包内 `id/version` 和 10 MiB 上限校验。
5. Gitee Release 用于人工下载、发布说明、历史追溯和回滚，不作为第一阶段的程序下载入口。
6. 软件仍保留内置产品快照；成功更新的包继续保存在离线缓存中，断网时不会退回软件内置旧版本。

第一阶段建议使用 Gitee 主源、GitHub 备用源。两个源发布的同版本文件必须具有相同 SHA256，客户端按顺序尝试，任一来源校验失败都不能写入缓存。

## 为什么不能直接替换 GitHub Raw 域名

2026-07-20 对 Gitee 公开接口的验证结果：

| 能力 | 结果 | 用途 |
| - | - | - |
| 公开仓库信息 API | 无 token 可读取 | 检查仓库和默认分支 |
| Contents API | 无 token 可读取，带浏览器 `Origin` 时返回 `Access-Control-Allow-Origin: *` | 自动读取 catalog 和小型 SBEXT |
| Releases API | 无 token 可读取，带浏览器 `Origin` 时允许跨域 | 查询版本和发布说明 |
| Raw 文件地址 | 会跳转到 `raw.giteeusercontent.com`，最终响应未提供稳定的 CORS 头 | 不直接用于 Renderer 自动更新 |
| Release 下载地址 | 首个 302 响应未返回 CORS 头，最终附件响应允许跨域 | 只用于人工下载，不用于 Renderer 自动更新 |
| 未认证 API 限额 | 实测为 60 次/小时 | 必须减少请求次数并缓存 catalog |

当前 GitHub 实现使用 `raw.githubusercontent.com`，返回体就是 JSON 或二进制。Gitee Contents API 返回 JSON，其中 `content` 是 Base64 文本，因此客户端需要增加 provider 解码层，不能只替换 URL。

Gitee 官方接口资料：

- [Gitee API v5 Swagger](https://gitee.com/api/v5/swagger)
- [Gitee API v5 OpenAPI JSON](https://gitee.com/api/v5/swagger_doc.json)

## 推荐仓库结构

Gitee 新建一个公开仓库，例如 `COMPANY/scratch-product-extensions`，结构与现有产品总仓库保持一致：

```text
scratch-product-extensions/
├── README.md
├── catalog.json
├── product-extension-registry.json
├── products/
│   └── aimecanum/
│       ├── manifest.json
│       ├── blocks.json
│       ├── generator/
│       │   └── python.json
│       └── libraries/
└── dist/
    └── aimecanum-0.2.2.sbext
```

`catalog.json` 仍是客户端唯一的产品版本目录。不要在每次检查更新时遍历仓库目录，也不要逐个产品查询 latest Release，否则产品越多，请求量越大，并且容易触发未认证限额。

## Gitee API 调用方式

### 读取 catalog

```http
GET https://gitee.com/api/v5/repos/OWNER/REPO/contents/catalog.json?ref=main
```

响应中的关键字段：

```json
{
  "type": "file",
  "encoding": "base64",
  "content": "eyJmb3JtYXRWZXJzaW9uIjoxLC4uLn0=",
  "sha": "..."
}
```

客户端先校验 `encoding === "base64"`，再解码为 UTF-8 文本并按现有 catalog schema 解析。

### 读取 SBEXT

```http
GET https://gitee.com/api/v5/repos/OWNER/REPO/contents/dist/aimecanum-0.2.2.sbext?ref=main
```

客户端把 Base64 解码为 `ArrayBuffer`，然后进入现有流程：

```text
大小检查
  -> SHA256 校验
  -> package-reader 解析
  -> manifest.id/version 与 catalog 对比
  -> 写入离线缓存
  -> 注册积木和 Python 模板
```

路径中的每一段都要分别进行 URL 编码，并保留 `/` 作为目录分隔符。客户端不能执行仓库中的 JavaScript，只读取声明式 JSON、Python 运行库和标准 `.sbext`。

### Release 查询

Gitee API 提供 latest Release 和附件接口：

```text
GET /api/v5/repos/{owner}/{repo}/releases/latest
GET /api/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files
GET /api/v5/repos/{owner}/{repo}/attach_files/{attach_file_id}
GET /api/v5/repos/{owner}/{repo}/attach_files/{attach_file_id}/download
```

附件对象包含 `id`、`name`、`size` 和 `browser_download_url`。公司测试 Release 的最终附件响应支持跨域，但下载入口的首个 302 响应没有 CORS 头，因此第一阶段仍不让 Renderer 依赖附件下载。

## 客户端适配设计

现有 `remote-library-client.js` 同时承担 URL 请求、catalog 解析和包下载。接入 Gitee 时建议只增加一层轻量来源适配，不改变后续安全校验：

```text
remote source
  ├── direct：GitHub Raw，直接读取 JSON/ArrayBuffer
  └── gitee-contents：读取 API JSON，再解码 Base64
          ↓
统一 JSON/ArrayBuffer
          ↓
现有 catalog 校验、SHA256、SBEXT 解析和缓存
```

建议的来源配置：

```json
{
  "catalogSources": [
    {
      "provider": "gitee",
      "repository": "COMPANY/scratch-product-extensions",
      "ref": "main",
      "path": "catalog.json"
    },
    {
      "provider": "direct",
      "url": "https://raw.githubusercontent.com/COMPANY/scratch-product-extensions/main/catalog.json"
    }
  ]
}
```

产品条目也应使用结构化来源，不让业务代码根据域名猜 provider：

```json
{
  "packageId": "aimecanum",
  "version": "0.2.2",
  "asset": "aimecanum-0.2.2.sbext",
  "sha256": "053d3e55c1baf41973a7abc4e636201fd6ac848990bb767d1d839e5e36a656be",
  "sources": [
    {
      "provider": "gitee",
      "repository": "COMPANY/scratch-product-extensions",
      "ref": "main",
      "path": "dist/aimecanum-0.2.2.sbext"
    },
    {
      "provider": "direct",
      "url": "https://raw.githubusercontent.com/COMPANY/scratch-product-extensions/main/dist/aimecanum-0.2.2.sbext"
    }
  ],
  "status": "published"
}
```

为兼容已发布的 GitHub catalog，客户端第一阶段仍需接受旧 `downloadUrl`，同步脚本对新条目生成 `sources`。

## 发布流程

单人维护时建议 GitHub 仍是源仓库，Gitee 是国内镜像；两边也可以反过来，但必须明确唯一写入源，避免双向修改产生冲突。

```text
修改产品源并升级 manifest.version
  -> npm run sync:product-extensions
  -> 产品包测试和 SHA256 核对
  -> 提交产品总仓库
  -> 推送 GitHub 与 Gitee 的同一提交
  -> 两个平台创建相同 tag 和 Release
  -> 核对 Gitee Contents API 可读取 catalog 和 SBEXT
  -> catalog 状态由 draft 改为 published
  -> 旧客户端联网检查更新
  -> 断网重启验证缓存版本
```

Gitee 人工建仓后，先只发布一个测试版本。不要立即替换正式客户端来源，先确认：

1. 仓库为公开状态，未登录也能读取 Contents API。
2. `catalog.json` 和 `.sbext` 返回 `encoding: base64`。
3. 解码后的 `.sbext` SHA256 与 GitHub 文件一致。
4. Electron Renderer 能直接请求 API，无跨域报错。
5. 更新成功后断网重启仍使用缓存版本。
6. Release 附件可由浏览器人工下载；自动附件下载是否可用单独记录。

## 风险和边界

| 风险 | 当前处理 |
| - | - |
| API 未认证限额较低 | 一次检查只读取一个 catalog；设置会话缓存；不逐产品查询 Release |
| Contents API 返回 Base64，响应大于原文件 | 当前包较小可接受；继续保留 10 MiB 解码后上限 |
| Gitee 服务或线路暂时不可用 | 依次尝试 GitHub 备用源，最后使用已校验离线缓存 |
| 两个平台文件不一致 | 对所有来源使用 catalog 中同一个 SHA256，失败来源不得安装 |
| 同版本被覆盖 | 发布后禁止修改同版本包，修复必须升级版本号 |
| 未来包内运行库变大 | 改用经过 CORS 验证的 Release 附件、对象存储或 CDN，不改变 catalog 和校验层 |
| 私有仓库需要 token | 第一阶段只支持公开仓库，不把个人令牌放入前端或安装包 |

## 实施顺序

1. 人工创建 Gitee 公开镜像仓库并推送当前产品总仓库。
2. 用该仓库验证 Contents API、Renderer CORS、Base64 解码和实际限额。
3. 单独提交当前未提交的串口中文注释，避免与 Gitee 功能混合。
4. 增加 `direct` 和 `gitee-contents` 两种来源读取器。
5. 扩展 registry 配置与同步脚本，生成 Gitee/GitHub 双来源。
6. 增加 catalog 解码、SBEXT 解码、主源失败回退、SHA256 不一致拒绝等单元测试。
7. 接入一个 `draft` 测试版本，完成联网更新和断网恢复人工验收。
8. 验收通过后再把 Gitee 调整为默认主源。

这套方案不改变积木包格式，也不改变产品配置的维护方式。主要新增工作集中在远程来源读取和同步配置，现有安装、校验、注册与缓存链路都可以继续使用。
