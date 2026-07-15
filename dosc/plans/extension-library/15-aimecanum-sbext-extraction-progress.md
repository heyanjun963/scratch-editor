# 15 AI机甲麦轮车 SBEXT 外置执行记录

> 执行日期：2026-07-15
> 本轮目标：把 AI机甲麦轮车从内置 JS manifest 迁出，形成可重复打包、可重新导入的标准 `.sbext`，并补齐自动化验证。

## 本轮结论

本轮目标已经完成。AI机甲麦轮车的 58 个积木、20 个菜单和 Python 生成模板不再维护在 `builtin-product-manifests/aimecanum.js` 中，唯一配置维护源改为 `builtin-product-packages/aimecanum/`。

编辑器内置产品和生成的 `.sbext` 共用同一份 `manifest.json`、`blocks.json` 和 `generator/python.json`。自动化测试会重新执行打包、读取压缩包并与内置 manifest 做完整相等比较，防止只修改源包却忘记验证导入链路。

## 标准源包结构

```text
builtin-product-packages/aimecanum/
├── manifest.json
├── blocks.json
├── generator/
│   └── python.json
└── docs/
    └── README.md
```

字段职责：

| 文件 | 职责 |
| - | - |
| `manifest.json` | 产品 id、名称、版本、颜色、菜单、入口和运行库清单 |
| `blocks.json` | 58 个积木的分类、opcode、文案、参数、菜单引用和默认值 |
| `generator/python.json` | 每个 opcode 的 Python 模板、imports、variables、setup 和入口规则 |
| `docs/README.md` | 包维护说明和打包命令 |

## 运行链路

```text
标准源包 JSON
  -> createPackageManifest
  -> builtinProductManifests.aimecanum
  -> manifestToExtensionObject
  -> VM registerExtensionObject

同一标准源包目录
  -> pack-custom-extension.mjs
  -> static/extensions/aimecanum.sbext
  -> readCustomExtensionPackageBuffer
  -> createPackageManifest
```

`package-manifest.js` 是两条链路的共用合并层。这样内置加载和外部导入不会分别维护 block/generator 合并规则。

## 变更文件与 Review 结论

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `src/lib/custom-extension/builtin-product-packages/aimecanum/*` | AI机甲麦轮车标准源包 | 已覆盖旧 manifest 的 58 个积木、20 个菜单和全部 Python 元数据 |
| `src/lib/custom-extension/builtin-product-manifests/index.js` | 从标准源包构造内置 manifest | 不再依赖产品专用大 JS 文件 |
| `src/lib/custom-extension/package-manifest.js` | 统一合并 manifest、blocks、generator 和 runtime files | 内置加载与 `.sbext` 导入共用同一规则 |
| `src/lib/custom-extension/package-reader.js` | 解析本地文件和内存二进制包 | 新增 buffer 入口，可供测试、Electron 和后续远程下载复用 |
| `scripts/pack-custom-extension.mjs` | 通用目录包打包器 | 校验三个必需文件，保持相对路径，固定 ZIP 时间并使用 DEFLATE 生成可重复构建的 `.sbext` |
| `static/extensions/aimecanum.sbext` | 可下载、可重新导入的实际产物 | 当前产物 6538 bytes，包含四个标准文件 |
| `test/unit/lib/custom-extension/aimecanum-package.test.js` | 打包和重新导入回归测试 | 验证包结构、重复打包字节一致、manifest 完整相等、积木数量和关键产码模板 |
| `package.json` | 增加 `pack:extensions` 命令 | 未增加新依赖，复用项目当前 JSZip |

旧文件 `builtin-product-manifests/aimecanum.js` 已删除，避免出现两份可修改的产品配置源。

## 验证结果

已执行：

```text
npm run pack:extensions
  通过，生成 static/extensions/aimecanum.sbext

npx jest test/unit/lib/custom-extension/aimecanum-package.test.js --runInBand
  通过，2 tests passed

git diff --check
  通过
```

还执行了旧 JS manifest 与新源包 manifest 的一次性迁移等价校验，结果为 58 个积木、20 个菜单完全一致；只新增标准包的 `package.fileName` 和 `package.structure` 元数据。

ESLint 未能启动。当前 `node_modules` 缺少 `unrs-resolver` 的可选原生绑定，ESLint 9 在加载配置时退出。本轮按仓库规则没有删除 lockfile、重装依赖或运行 `npm install`。

## 已知 TODO

1. 当前产品拓展页的“导出”仍输出归一化 JSON，尚未直接下载这份 `.sbext`。
2. `pack:extensions` 当前明确打包 AI机甲麦轮车，后续产品增加后可扩展为扫描所有标准源包。
3. 尚未实现 GitHub/Gitee Release URL 解析、版本查询、下载、SHA256 校验和缓存。
4. 尚未把拓展版本、来源、tag 和 checksum 写入项目元数据。
5. 在依赖环境修复后补跑相关文件 ESLint；不需要为此修改业务代码。

## 下一轮建议

下一轮直接以 `static/extensions/aimecanum.sbext` 作为第一个公开仓库 Release 测试包，实现：

```text
GitHub/Gitee 仓库地址
  -> provider URL 解析
  -> 查询 Release/tag
  -> 下载 aimecanum.sbext
  -> SHA256 校验
  -> readCustomExtensionPackageBuffer
  -> 复用现有安装和 VM 注册链路
```
