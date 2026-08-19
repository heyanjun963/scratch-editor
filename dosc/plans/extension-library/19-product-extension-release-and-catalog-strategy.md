# 19 产品积木发版流程与动态产品目录策略

> 目标：整理当前可执行的产品积木发版流程，并确定新增产品、旧产品更新和软件发版之间的边界，降低单人长期维护成本。

## 结论

采用“云端目录为主、软件内置快照兜底”的混合方案：

- 旧产品的积木、菜单和 Python 模板兼容更新，只发布新的 `.sbext`，不重发软件。
- 使用现有包格式和生成能力的新产品，也应通过云端 `catalog.json` 发布，不重发软件。
- 只有包协议、VM、代码生成器、串口上传、安全规则或 UI 能力变化时，才发布新软件。
- 软件安装包保留一组经过验证的默认产品快照，首次离线使用有兜底；用户下载过的更高版本继续优先使用本地缓存。

当前版本还不能完整执行第二条。页面只遍历本地固定的 `product-extension-catalog.js`，远端 catalog 只能更新同 ID 产品；远端新增一个本地不存在的产品时，旧客户端会忽略它。因此需要随下一次软件版本完成一次“远端新增产品合并”能力，此后兼容的新产品才可以只发云端包。

## 为什么不让每个新产品都跟随软件发版

| 方案 | 开发成本 | 日常维护 | 用户获得新产品 | 离线能力 | 结论 |
| - | - | - | - | - | - |
| 新产品必须重发软件 | 初期最低 | 每次都要构建、回归和发布整套软件 | 必须升级软件 | 完整 | 不适合长期维护 |
| 全部只依赖云端 | 需要动态目录 | 产品发版最简单 | 打开目录即可发现 | 首次断网不可用 | 不单独采用 |
| 云端目录 + 内置快照 | 一次性补齐目录合并和兼容检查 | 产品与软件可独立发版 | 兼容产品无需升级软件 | 有默认包和下载缓存 | 推荐 |

对单人维护而言，混合方案能把高频的产品配置更新与低频的软件发布拆开。软件回归只在基础能力变化时进行，普通积木改动只验证对应产品包。

## 当前可执行的发版流程

现阶段产品源仍以软件仓库中的目录为准：

```text
packages/scratch-gui/src/lib/custom-extension/builtin-product-packages/<产品ID>/
```

同步命令会覆盖产品总仓库中的同名 `products/<产品ID>`，所以在同步方向调整前，不要只修改产品总仓库中的同名源目录。

### 1. 修改并升级版本

修改该产品的 `manifest.json`、`blocks.json`、`generator/python.json` 或运行库文件，并先更新 `manifest.version`。

版本建议遵守：

| 改动 | 版本示例 |
| - | - |
| 修正文案、模板或不改变已有积木含义的缺陷 | `0.2.2 -> 0.2.3` |
| 新增兼容积木、菜单或可选能力 | `0.2.2 -> 0.3.0` |
| 删除或重命名 opcode、修改已有积木含义等破坏性变更 | `0.x -> 1.0.0` 或下一主版本 |

禁止修改已经发布版本的内容后继续使用原版本号。同步脚本会重新生成同名文件和 SHA256，同版本覆盖会导致已下载文件与 catalog 记录不再一致，也无法可靠追溯项目使用的包。

### 2. 执行针对性验证

在 `D:\code\scratch-editor\packages\scratch-gui` 中运行对应产品包测试。AI 机甲麦轮车当前使用：

```powershell
npx jest test/unit/lib/custom-extension/aimecanum-package.test.js --runInBand
```

至少人工检查：

1. 新增或修改的积木能显示，字段和菜单正常。
2. 生成的 Python 与预期一致，import、setup 和主程序位置正确。
3. 原有代表性项目仍能生成代码。
4. 涉及硬件行为时记录真机待验项，不用桌面预览代替真机结论。

### 3. 同步到产品配置总仓库

在 `D:\code\scratch-editor` 执行：

```powershell
npm run sync:product-extensions
```

命令会完成：

```text
读取内置产品源目录
  -> 复制到 D:\code\scratch-product-extensions\products\<产品ID>
  -> 生成 dist\<产品ID>-<版本>.sbext 或 .mpext
  -> 计算 SHA256
  -> 更新 catalog.json
  -> 新版本状态写为 draft
```

发布标识分为两层：

- `version` 是每个产品自己的语义化版本，客户端用它判断是否有更新。
- `tag` 是一次批量 Release 的统一标签，只用于定位 Release 下的 asset。

在产品仓库的 `product-extension-registry.json` 中配置统一 `releaseTag`，例如 `python-blocks-v1.0.0`。本次同步生成的所有 catalog 条目都使用该值；产品文件名仍保留各自版本，例如 `aihexa-1.0.0.mpext`。

同步后在产品总仓库检查：

```powershell
cd D:\code\scratch-product-extensions
git status --short
git diff --check
```

并人工核对 `catalog.json` 中的 `packageId`、`version`、`tag`、`asset`、`downloadUrl`、`releaseDownloadUrl`、`sha256` 和 `status`。确认本轮所有条目的 `tag` 相同，但 `version` 仍按产品分别记录。

### 4. 提交并推送待发布文件

在 `D:\code\scratch-product-extensions` 提交以下内容：

- `products/<产品ID>/` 源配置。
- `dist/<产品ID>-<版本>.sbext` 或 `.mpext`。
- `catalog.json` 中状态为 `draft` 的新版本信息。

提交标题示例：

```text
feat: 发布 Mind+ 产品积木批次 python-blocks-v1.0.0
```

推送 `main` 后，先确认 Raw 地址可以下载新的产品包。

### 5. 人工创建 GitHub Release

在 GitHub 仓库页面执行：

1. 打开 **Releases**，选择 **Draft a new release**。
2. 创建 `product-extension-registry.json` 中指定的统一标签，例如 `python-blocks-v1.0.0`。
3. 标签目标选择刚推送产品包的 `main` 提交。
4. Release 正文列出本批包含的产品、各自版本、积木变化、兼容影响和真机验证情况。
5. 一次上传本批所有 `dist/*.mpext` 或 `dist/*.sbext` 产品包，不要上传 GitHub 自动生成的源码包作为产品包。
6. 发布 Release，并从 Assets 重新下载每个文件核对 SHA256。

### 6. 开放给客户端

Release 和 Raw 文件都确认可用后，将本批已验证产品在 `catalog.json` 中的 `status` 从 `draft` 改为 `published`，再提交并推送 `main`。

不要在文件尚未上传或 SHA256 尚未验证时提前设为 `published`。客户端只读取 `published` 条目，该状态是正式开放更新的开关。

### 7. 客户端验收

使用至少两个场景验证：

1. 旧版本软件联网打开拓展库，点击“检查版本”，确认显示正确的当前版本和新版本，确认后能下载、校验并加载。
2. 更新成功后断网重启，确认继续使用已缓存的新版本，不回退到软件内置旧版本。

发现问题时先把 catalog 状态改回 `draft` 并推送，阻止新的客户端安装；不要删除已经发布的 tag 和历史包。修复后使用新版本号重新发布。

## 新产品动态发现的目标设计

### 当前限制

当前合并逻辑以本地固定列表为入口：

```text
product-extension-catalog.js 中的产品
  -> 按相同 packageId 查找远端版本
  -> 合并内置包、远端缓存和远端版本
```

因此存在两个直接结果：

- 已在本地列表中的产品可以通过云端升级。
- 只存在于远端 catalog 的新产品不会生成卡片，也不会进入“检查版本”。

### 下一次软件版本需要补齐

1. catalog 条目增加 `tab`、`categoryId`、`categoryLabel`、`sortOrder` 和最低软件版本等展示与兼容字段。
2. 页面按 `packageId` 合并“本地列表、远端 catalog、已下载缓存”的并集，不再只遍历本地列表。
3. 远端独有且兼容的产品显示为“可下载”，用户确认后再安装，不静默下载。
4. 缓存远端产品的目录元数据；产品下载成功后，断网重启仍能显示和加载。
5. 不满足最低软件版本的产品不安装，明确提示需要升级软件。
6. 保留内置产品快照；没有网络和缓存时只显示软件内置版本。

建议的远端条目补充字段：

```json
{
  "packageId": "new-product",
  "name": "新产品",
  "version": "1.0.0",
  "tab": "main",
  "categoryId": "robots",
  "categoryLabel": "机器人",
  "sortOrder": 100,
  "compatibility": {
    "minEditorVersion": "14.2.0",
    "manifestFormatVersion": 2
  },
  "status": "published"
}
```

这些字段可以作为 catalog v1 的可选增量字段。当前旧客户端会忽略未知字段，新客户端读取它们；真正的 catalog 结构发生不兼容变化时再提升 `formatVersion`。

## 单人维护下的最终仓库职责

动态目录能力落地后，建议把 `scratch-product-extensions` 调整为产品配置的唯一源头：

```text
scratch-product-extensions
  日常维护所有产品源配置、历史 SBEXT、catalog 和 Release

scratch-editor
  维护包解析、积木注册、代码生成、串口上传和 UI
  软件发版前从产品仓库同步一组已验证的离线默认快照
```

当前 `npm run sync:product-extensions` 是从软件仓库同步到产品仓库，属于过渡流程。后续应增加“产品仓库打包发布”和“选择产品版本导入软件内置快照”两个方向明确的命令，避免同一份产品源在两个仓库里来回修改。

## 何时发产品包，何时发软件

| 变更场景 | 发布产品包 | 发布软件 |
| - | - | - |
| 修复旧产品积木或 Python 模板 | 是 | 否 |
| 给旧产品新增兼容积木 | 是 | 否 |
| 新产品完全使用现有 manifest 和生成能力 | 是 | 动态目录能力落地后不需要 |
| 新产品需要新的自定义字段或运行时能力 | 是 | 是 |
| 修改串口上传协议、设备识别或桌面 IPC | 视情况 | 是 |
| 修改 SBEXT/schema/安全校验规则 | 是 | 是 |
| 仅刷新离线默认产品版本 | 否，产品版本已发布 | 随计划中的软件版本带入 |

## 后续实施顺序

1. 先提交并验证当前版本显示和桌面端口复用修复。
2. 为远端新增产品补充失败测试，证明本地列表没有该 ID 时当前页面不会显示。
3. 扩展 catalog 元数据，并实现本地、远端和缓存三方并集合并。
4. 增加最低软件版本检查和远端目录元数据缓存。
5. 完成一次“远端新增测试产品、旧客户端发现并下载、断网仍保留”的闭环验收。
6. 再把产品源权威位置迁到产品总仓库，并拆分打包发布与内置快照同步命令。
