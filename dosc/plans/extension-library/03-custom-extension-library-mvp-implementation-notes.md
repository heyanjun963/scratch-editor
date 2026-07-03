# 自定义积木拓展库 MVP 实施记录

> 类型：实现记录 + 人工验证说明。
> 对应方案：[02 自定义积木拓展库具体实施方案](./02-custom-extension-library-implementation-plan.md)。
> 当前状态：已完成第一版最小链路代码，等待桌面端人工验证。

---

## 1. 本轮实现范围

本轮按 MVP 路线实现：

```text
导入 manifest.json
  -> 校验 manifest
  -> 保存到 GUI Redux
  -> 扩展库出现自定义库卡片
  -> 点击卡片注册 VM 扩展
  -> Python 模式左侧出现自定义分类
  -> 拖拽积木到画布
  -> Python codegen 按模板生成代码
  -> 可导出 manifest.json
  -> 导入/删除结果可保存到 Electron 用户数据目录
```

本轮仍不做：

- `.sbext` zip 包。
- 自定义库随 `.sb3` 迁移。
- 舞台模式执行自定义 opcode。
- 可视化积木编辑器。
- 用户上传 JS 扩展。

---

## 2. 代码分布

### 2.1 GUI 自定义库模块

新增目录：

```text
packages/scratch-gui/src/lib/custom-extension/
```

| 文件 | 作用 |
| - | - |
| `manifest-schema.js` | 校验和规范化 `manifest.json` |
| `manifest-to-extension.js` | 把 manifest 转成 VM 可注册的 extension object |
| `codegen-registry.js` | 保存自定义 block.type 到 Python 模板的映射 |
| `library-store.js` | 自定义库导入/导出卡片使用的默认图标 |
| `persistence.js` | 优先通过桌面端 IPC 保存到用户数据目录，Web 端回退到 `localStorage` |

### 2.2 Redux 状态

新增：

```text
packages/scratch-gui/src/reducers/custom-extensions.js
```

接入：

```text
packages/scratch-gui/src/reducers/gui.ts
```

当前状态：

```js
{
  installedLibraries: [
    {
      id: 'companydemo',
      name: '公司演示库',
      version: '1.0.0',
      manifest: {}
    }
  ]
}
```

启动时会从本地持久化恢复已导入的库。桌面端优先使用 Electron 用户数据目录，Web 端回退到 `localStorage`。

桌面端文件位置：

```text
<Electron userData>/custom-extension-libraries/libraries.json
```

### 2.3 扩展库 UI

修改：

```text
packages/scratch-gui/src/containers/extension-library.jsx
packages/scratch-gui/src/components/library/library.jsx
```

实现内容：

- 在 Python 模式的扩展库里增加“Import Custom Library”卡片。
- 导入 `.json` 后，把 manifest 保存到 Redux。
- 已导入的库会显示为自定义库卡片。
- 每个自定义库会额外显示一个导出卡片。
- 导出时会清理 `scratchBlockType`、`scratchType` 等运行时字段，只保留标准 manifest 字段。
- 每个自定义库会额外显示一个删除卡片，删除后会移除当前会话中的库、codegen 模板和 VM 分类。
- 导入和删除会同步更新 Electron 用户数据目录；Web 端则回退更新 `localStorage`。
- LibraryComponent 增加 `keepLibraryOpenOnSelect`，避免点击导入卡片时弹窗先关闭导致文件选择器无法打开。

### 2.4 桌面端 IPC

修改：

```text
desktop/main.js
desktop/preload.js
```

实现内容：

- preload 暴露 `window.scratchDesktopCustomExtensions.load()`。
- preload 暴露 `window.scratchDesktopCustomExtensions.save(manifests)`。
- main 进程通过 `customExtensions:load` / `customExtensions:save` 读写用户数据目录。
- IPC 会校验调用方来自编辑器 tab，避免首页或非编辑器 WebContents 调用。

### 2.5 VM 注册

修改：

```text
packages/scratch-vm/src/extension-support/extension-manager.js
```

新增：

```js
registerExtensionObject(extensionId, extensionObject)
```

用途：

- 接收由 manifest 动态生成的 extension object。
- 复用 VM 现有 `_registerInternalExtension` 注册链路。
- 让 Runtime 继续负责积木信息清洗、分类刷新和 Blockly JSON/XML 生成。

### 2.6 Python codegen

修改：

```text
packages/scratch-vm/src/codegen/python.js
packages/scratch-vm/src/virtual-machine.js
packages/scratch-vm/src/index.js
packages/scratch-gui/src/lib/python-codegen/index.js
```

实现内容：

- Python 生成核心迁入 `scratch-vm/src/codegen/python.js`。
- `VirtualMachine` 暴露 `generatePythonCode(workspace, options)`。
- `@scratch/scratch-vm` 包入口暴露 `generatePythonCode`。
- GUI 的 `python-codegen/index.js` 缩成桥接层，只负责把自定义模板查询函数传给 VM。
- VM 侧保留现有内置 Python 积木逻辑，并增加自定义 block 的模板兜底。
- 支持 `{ARG}` 占位符替换。
- 支持 manifest 中的 `imports` 合并到 Python 文件顶部。

### 2.7 Python 模式工具栏

修改：

```text
packages/scratch-gui/src/containers/blocks.jsx
```

实现内容：

- 原来 Python 模式只显示内置 Python 扩展分类。
- 现在会把已导入的自定义扩展 id 加入白名单。
- VM 注册自定义扩展后，自定义分类可以进入左侧工具栏。

---

## 3. 测试用 manifest

人工验证时可以新建一个 `companydemo.json`：

```json
{
  "formatVersion": 1,
  "id": "companydemo",
  "name": "公司演示库",
  "version": "1.0.0",
  "color1": "#4C97FF",
  "color2": "#3373CC",
  "color3": "#285CA3",
  "blocks": [
    {
      "opcode": "print_text",
      "blockType": "command",
      "text": "打印 [TEXT]",
      "arguments": {
        "TEXT": {
          "type": "string",
          "defaultValue": "hello custom block"
        }
      },
      "codegen": {
        "python": {
          "template": "print({TEXT})",
          "imports": []
        }
      }
    },
    {
      "opcode": "add_numbers",
      "blockType": "reporter",
      "text": "[A] 加 [B]",
      "arguments": {
        "A": {
          "type": "number",
          "defaultValue": 1
        },
        "B": {
          "type": "number",
          "defaultValue": 2
        }
      },
      "codegen": {
        "python": {
          "template": "({A} + {B})",
          "imports": []
        }
      }
    },
    {
      "opcode": "sleep_seconds",
      "blockType": "command",
      "text": "等待 [SECS] 秒",
      "arguments": {
        "SECS": {
          "type": "number",
          "defaultValue": 1
        }
      },
      "codegen": {
        "python": {
          "template": "time.sleep({SECS})",
          "imports": ["time"]
        }
      }
    }
  ]
}
```

---

## 4. 人工验证步骤

### 4.1 导入和显示

1. 启动桌面端。
2. 进入 Python 编码模式。
3. 打开扩展库。
4. 点击 **Import Custom Library**。
5. 选择 `companydemo.json`。
6. 预期：提示导入成功，扩展库列表出现“公司演示库”和“Export 公司演示库”。

### 4.2 加载到左侧工具栏

1. 在扩展库里点击“公司演示库”。
2. 预期：左侧工具栏出现“公司演示库”分类。
3. 预期：分类下出现“打印 [TEXT]”“[A] 加 [B]”“等待 [SECS] 秒”三个积木。

### 4.3 生成 Python

1. 拖出“打印 [TEXT]”积木。
2. 预期右侧代码区出现类似：

```python
print("hello custom block")
```

3. 拖出“等待 [SECS] 秒”积木。
4. 预期顶部出现 `import time`，代码里出现：

```python
time.sleep(1)
```

### 4.4 导出

1. 重新打开扩展库。
2. 点击“Export 公司演示库”。
3. 预期下载 `companydemo.custom-extension.json`。
4. 预期导出文件不包含 `scratchBlockType`、`scratchType`、`icon: null`。
5. 再次导入该文件，预期仍能正常显示和生成代码。

### 4.5 删除

1. 重新打开扩展库。
2. 点击“Delete 公司演示库”。
3. 预期“公司演示库”“Export 公司演示库”“Delete 公司演示库”从扩展库列表消失。
4. 预期左侧工具栏中的“公司演示库”分类消失。
5. 再次导入 `companydemo.json`，预期可以重新加载并生成 Python。

### 4.6 桌面端持久化

1. 导入 `companydemo.json`。
2. 关闭桌面端窗口。
3. 重新运行 `npm run desktop`。
4. 进入 Python 模式并打开扩展库。
5. 预期：“公司演示库”仍然存在。
6. 点击“公司演示库”，预期左侧工具栏能重新出现该分类。
7. 预期 Electron 用户数据目录下存在 `custom-extension-libraries/libraries.json`。
8. 点击“Delete 公司演示库”后再次重启，预期该库不再恢复。

---

## 5. 已知限制

- 自定义库当前保存为单个 `libraries.json`，还没有做每个库独立目录。
- 如果用户删除 Electron 用户数据目录，桌面端自定义库需要重新导入。
- 导入卡片和导出卡片还是 MVP 交互，不是最终“管理库”面板。
- 自定义积木点击绿旗时只是 no-op，不会在 Scratch 舞台模式执行真实逻辑。
- Python 模板只做占位符替换，不支持复杂 AST 级代码生成。
- 删除自定义库会同步清理 `libraries.json`，后续 `.sbext` 阶段还要同步删除实际库文件和运行库文件。

---

## 6. 后续建议

下一步优先做：

1. 把导入/导出/删除从卡片交互升级成“管理库”面板。
2. 支持 `.sbext` zip 包和 `libraries/*.py` 运行库。
3. 研究 `.sb3` 附加 manifest，让项目跨电脑不丢自定义积木。
