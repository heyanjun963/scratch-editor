# 17 产品配置总仓库与同步命令执行记录

> 本轮目标：在 `D:\code` 下建立独立的多产品配置仓库，并让 `scratch-editor` 可以用一条命令同步标准 JSON 源配置、SBEXT 发布包和 catalog 元数据。

## 仓库职责

```text
D:\code\scratch-editor
  编辑器源码和随软件发布的离线默认产品包

D:\code\scratch-product-extensions
  多产品源配置、远程 catalog 和 GitHub Release 待发布包
```

独立仓库已初始化为本地 Git 仓库，默认分支为 `main`。本轮没有创建 GitHub 远程、提交或发布 Release，这些强交互操作保留给人工执行。

## 同步命令

在 `scratch-editor` 根目录执行：

```powershell
npm run sync:product-extensions
```

默认目标是相邻目录 `D:\code\scratch-product-extensions`。也可以通过 `--target` 或 `PRODUCT_EXTENSION_REPOSITORY` 指定其他产品配置仓库。

同步流程：

```text
builtin-product-packages/*
  -> 校验目录名、manifest.id 和 version
  -> 同步 products/<packageId> 源配置
  -> 生成 dist/<packageId>-<version>.sbext
  -> 计算发布包 SHA256
  -> 按 packageId 增量更新 catalog.json
```

脚本只更新编辑器中存在的内置默认产品，不删除总仓库中独立维护的其他产品。新版本生成新的带版本号发布包，旧版本文件不会被主动清理。

## 路径保护

目标目录必须包含 `product-extension-registry.json`，且 `repositoryType` 必须是 `scratch-product-extension-registry`。同步脚本还会拒绝把 `scratch-editor` 根目录或产品源目录作为目标。

这两个检查用于避免路径配置错误时覆盖软件仓库。

## 稳定 SHA256 修复

验证同步幂等性时发现，JSZip 自动创建的目录条目使用当前时间，导致相同源文件在不同时刻打包后 SHA256 不一致。

`pack-custom-extension.mjs` 现只写入时间固定的实际文件条目，不再写入自动目录条目。修复后重复打包的字节和 SHA256 保持一致，才能作为 Release 下载校验依据。

当前 AI 麦轮车发布信息：

```text
version: 0.2.1
tag: aimecanum-v0.2.1
asset: aimecanum-0.2.1.sbext
sha256: 80d8103390a5e4b09d96e16fb3a31d09126bb0d66fd48c739134b43aecd1e269
status: draft
```

公开仓库根 README 和包内说明均面向最终用户，不包含 `scratch-editor`、本机路径、内部同步命令或迁移过程。内部维护流程只记录在软件仓库文档中。

## 文件清单

| 文件 | 职责 |
| - | - |
| `scripts/sync-product-extensions.mjs` | 扫描所有内置标准产品包，复制源配置、打包并增量更新 catalog |
| `package.json` | 提供根命令 `sync:product-extensions` |
| `pack-custom-extension.mjs` | 生成跨进程稳定的 SBEXT 字节和 SHA256 |
| `sync-product-extensions.test.js` | 验证同步幂等、SHA256、其他产品保留和发布元数据 |
| `scratch-product-extensions/README.md` | 面向产品配置维护人员的同步与发布说明 |
| `scratch-product-extensions/product-extension-registry.json` | 目标仓库身份、provider、repository 和 Release 地址 |
| `scratch-product-extensions/catalog.json` | 编辑器后续读取的远程产品版本目录 |

## 验证结果

```text
npx jest test/unit/lib/custom-extension/aimecanum-package.test.js \
  test/unit/lib/custom-extension/sync-product-extensions.test.js --runInBand
  通过，2 suites / 3 tests

npm run sync:product-extensions
  通过，同步 1 个产品到 D:\code\scratch-product-extensions
```

## 人工 Release 步骤

1. 在 GitHub 创建公开仓库 `heyanjun963/scratch-product-extensions`。
2. 给本地总仓库添加远程并提交当前文件。
3. 推送 `main`。
4. 根据 `catalog.json` 创建标签 `aimecanum-v0.2.1`。
5. 创建同标签 Release，上传 `dist/aimecanum-0.2.1.sbext`。
6. 从 Release 重新下载并核对 SHA256。
7. 将 catalog 状态从 `draft` 改为 `published` 后提交并推送。

## 下一步

人工 Release 完成后，编辑器侧实现：

```text
读取 catalog.json
  -> 比较当前版本与 published 版本
  -> 下载 Release asset
  -> 校验 sha256
  -> package-reader 解析并注册
  -> 保存最近一次校验成功的远程缓存
```
