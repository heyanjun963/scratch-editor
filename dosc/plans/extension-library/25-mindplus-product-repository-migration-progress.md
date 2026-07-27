# Mind+ 产品仓库迁移进度

## 本轮目标

把产品源码管理入口切换到独立产品仓库，并验证同一份 Mind+ Python 源码可以生成稳定 `.mpext`、进入远程 catalog、被编辑器解析并保持现有 Python 输出。

> 当前状态：AiDoggy、miniHexa 和 AI 机甲麦轮车已统一使用 Mind+ Python 作者源，生成确定性 `.mpext` 并完成自动验证。三个 catalog 条目均已开放为 `published`；AiDoggy 已发布 `0.1.2`，编辑器仍内置 `0.1.0` 用于验证远程更新和离线缓存闭环。

## 源码与发布职责

| 位置 | 职责 |
| - | - |
| `scratch-product-extensions/products/<id>/` | 产品维护者编辑的唯一作者源目录 |
| `scratch-product-extensions/dist/` | 同步命令生成的确定性 `.sbext` 或 `.mpext` 发布包 |
| `scratch-product-extensions/catalog.json` | 软件检查更新时读取的产品版本、下载地址、SHA256 和发布状态 |
| `scratch-editor` 内置产品配置 | 由产品仓库 MPEXT 生成的离线快照；云端不可用时继续使用本机已安装版本或内置版本 |

同步命令只读取产品仓库源码，不再从编辑器反向覆盖 `products`。已有 catalog 中未参与本次同步的产品会保留；产品源码版本低于 catalog 时同步会失败。

```powershell
cd D:\code\scratch-editor
npm run sync:product-extensions
```

## 编辑器仓库改动

| 文件 | 作用 | 结论 |
| - | - | - |
| `packages/scratch-gui/scripts/pack-mindplus-extension.mjs` | 按固定文件顺序、时间和压缩级别生成 `.mpext` | 相同源码重复打包得到相同二进制和 SHA256 |
| `packages/scratch-gui/scripts/pack-mindplus-fixtures.mjs` | 复用通用打包器生成测试 fixture | 不再单独维护一套压缩规则 |
| `scripts/sync-builtin-product-snapshots.mjs` | 校验产品包 SHA256、ID 和版本后生成内置 MPEXT 与同步 manifest | 编辑器启动不再读取旧的拆分 JSON 产品包 |
| `scripts/sync-product-extensions.mjs` | 从产品仓库读取 Mind+ 或旧 SBEXT 源码，生成发布包并更新 catalog | 禁止低版本覆盖高版本；同版本资源或 SHA256 变化时自动回到 `draft` |
| `mindplus-package-adapter.js` | 接收产品图标、三层颜色、特殊参数和 `templateSelector` | 可表达 miniHexa 方向模板和 AI 麦轮车 `line6` 参数 |
| `package-reader.js` | 读取 Mind+ SVG/PNG 图标并交给静态转换器 | 导入过程仍不执行 `main.ts` |
| `manifest-to-extension.js` | 分离产品菜单图标与积木图标 | 产品图标不再显示在每块积木前，只有显式 `blockIcon` 才生成积木图标 |
| `remote-library-client.js` | 接受 catalog 中的 `.mpext` 资源 | `.sbext` 兼容保持不变 |
| `blocks.jsx` | 控制 Python 模式默认工具箱分类 | `pythonNative` 只保留旧工程解析能力，不再默认加载或展示 |
| 相关单元测试 | 覆盖 Mind+ 图标、模板选择、内置快照、远程资源、同步规则和默认工具箱 | 纳入 15 个 suite、64 项回归测试 |

## 产品仓库迁移结果

| 产品 | 作者源 | 发布包 | SHA256 | 状态 |
| - | - | - | - | - |
| AiDoggy | `products/aidoggy/` | `aidoggy-0.1.2.mpext` | `9930fafa1811d496c99d32308ce4291ec51c5632c4f920aaf21879345e5c0305` | `published` |
| miniHexa | `products/minihexa/` | `minihexa-0.1.1.mpext` | `7bbf1554e7dd67b7aa00d9e92b408f0ca7e2fb5cd2911c9597f71ca87d882478` | `published` |
| AI 机甲麦轮车 | `products/aimecanum/` | `aimecanum-0.2.3.mpext` | `30c5da5f7698f0a8c5b988aa462087ac82be06cd65027231294a9940ff651b95` | `published` |

AiDoggy `0.1.2` 发布包为 4709 字节，GitHub Release 下载内容与 catalog SHA256 完全一致；Gitee 和 GitHub catalog 已同步为 `published`。编辑器内置快照继续锁定 AiDoggy `0.1.0`，安装远程 `0.1.2` 后由持久化缓存覆盖内置版本。miniHexa 发布包经过本地解析后，与内置基线的 39 个 opcode、19 个菜单、9 个分类、积木参数和 Python codegen 元数据逐项一致。

AI 机甲麦轮车新增 `config.json`、`python/main.ts` 和 `python/_menus/index.json`。`aimecanum-0.2.3.mpext` 与 0.2.3 旧 JSON 基线的 59 个积木、20 个菜单、10 个分类、三层颜色、参数和 Python codegen 元数据一致。完成校对后，产品仓库和编辑器中的旧拆分 JSON 均已删除。

编辑器运行时从 `builtin-product-snapshots/manifests` 同步加载 manifest，`builtin-product-snapshots/packages` 保存对应 MPEXT。`index.json` 锁定版本和 SHA256。更新产品源码后先运行产品同步，再运行：

```powershell
npm run sync:builtin-product-snapshots
```

## 自动验证

```powershell
cd D:\code\scratch-editor\packages\scratch-gui
..\..\node_modules\.bin\jest.cmd --runInBand --runTestsByPath `
  test/unit/lib/custom-extension/aidoggy-codegen.test.js `
  test/unit/lib/custom-extension/aidoggy-package.test.js `
  test/unit/lib/custom-extension/aimecanum-package.test.js `
  test/unit/lib/custom-extension/builtin-product-snapshots.test.js `
  test/unit/lib/custom-extension/library-sources.test.js `
  test/unit/lib/custom-extension/mindplus-compatibility-fixtures.test.js `
  test/unit/lib/custom-extension/mindplus-package-reader.test.js `
  test/unit/lib/custom-extension/minihexa-codegen.test.js `
  test/unit/lib/custom-extension/minihexa-package.test.js `
  test/unit/lib/custom-extension/persistence.test.js `
  test/unit/lib/custom-extension/remote-library-cache.test.js `
  test/unit/lib/custom-extension/remote-library-client.test.js `
  test/unit/lib/custom-extension/sync-product-extensions.test.js `
  test/unit/components/product-extension-library.test.jsx `
  test/unit/containers/blocks.test.js
```

本轮结果：15 个 suite、64 项测试全部通过。三个实际 `.mpext` 均通过旧行为深比较，重复打包二进制和 SHA256 保持稳定。内置快照测试会重新解析三个 MPEXT，并校验同步 manifest 和 SHA256。Jest 仍提示仓库已有的重复 mock，Browserslist 数据也提示过期，两者均不是本轮失败。

## 人工发版与验收

1. 在产品仓库检查 `products/<id>/`、`dist/<id>-<version>.mpext` 和 `catalog.json`。
2. 本地导入 `.mpext`，核对分类顺序、中文文案、参数默认值和菜单值。
3. 每类积木至少生成一份 Python；方向菜单需要逐项切换并对照旧版输出。
4. 有真机时验证蜂鸣器、运动、按键、IMU 和串口功能。
5. 人工验证通过后，把 catalog 状态从 `draft` 改为 `published`。
6. 提交并推送产品仓库，创建 `<产品ID>-v<版本号>` 标签和 Release，再上传对应 `.mpext`。
7. 在已安装旧版本的软件中执行“检查更新”，确认下载、SHA256 校验、安装和离线重启均正常。

## 已知限制

- `asset.python.dependencies` 当前只进入 manifest，不会自动安装 pip 依赖。
- 项目文件尚未锁定产品拓展版本和 SHA256，旧项目的可重复生成仍需后续补齐。
- 三个产品仍需继续补充全量真机回归；公开版本出现问题时必须提升补丁版本，不能覆盖既有标签和发布包。
- 内置 manifest 是 MPEXT 的同步生成结果，不在浏览器启动时异步解压；更新产品后必须同时提交内置包、manifest 和 `index.json`。
- Arduino C 包解析和设备验证继续延后。
