# 06 WonderCam-like 新版拓展包格式落地记录

> 目标：参考 WonderCam 的目录组织方式，但不兼容旧版 `Blockly.Blocks.*`、`Blockly.Python.*` 语法。新版拓展包只使用声明式 JSON，让 Scratch GUI/VM 能安全导入、注册积木并生成 Python。

## 1. 当前实现范围

本轮支持三类导入文件：

| 文件 | 说明 |
| - | - |
| `.json` | 兼容早期单文件 manifest |
| `.zip` | 新版目录型拓展包 |
| `.sbext` | 本质仍是 zip，用作产品拓展包后缀 |

导入后的统一链路：

```text
库管理器选择文件
  -> package-reader 读取 JSON 或 zip
  -> manifest-schema 校验并归一化
  -> manifest-to-extension 注册 VM 扩展
  -> codegen-registry 注册 Python 模板
  -> persistence 保存到 localStorage / Electron userData
```

## 2. 推荐目录结构

```text
ai-mecanum-package-v2/
├── config.json
├── blocks.json
├── generator/
│   └── python.json
├── libraries/
│   └── aimecanum_notes.py
└── docs/
    └── README.md
```

也支持把 `config.json` 命名为 `manifest.json`。

## 3. config.json

`config.json` 放库的元信息、入口文件和运行库声明。

```json
{
  "formatVersion": 2,
  "id": "aimecanum",
  "name": "AI 机甲麦轮车",
  "version": "1.0.0",
  "description": "从旧版 python-generator.js 中迁移的 AI 机甲麦轮车 Python 积木示例库",
  "target": "python",
  "color1": "#ff8c1a",
  "color2": "#db6e00",
  "color3": "#b85c00",
  "entry": {
    "blocks": "blocks.json",
    "python": "generator/python.json"
  },
  "runtime": {
    "pythonLibraries": [
      "libraries/aimecanum_notes.py"
    ]
  }
}
```

约束：

- `id` 只能包含小写字母和数字。
- `formatVersion` 必须是 `2`。
- `target` 当前建议固定为 `python`，这样会显示在库管理器 Python 页签。

## 4. blocks.json

`blocks.json` 定义积木显示形态。

```json
{
  "categories": [
    {
      "id": "motion",
      "name": "运动底盘",
      "blocks": ["when_start", "main", "move_dir"]
    }
  ],
  "blocks": [
    {
      "opcode": "main",
      "blockType": "hat",
      "text": "主程序",
      "category": "motion",
      "arguments": {}
    },
    {
      "opcode": "move_dir",
      "blockType": "command",
      "text": "麦轮车按方向 [DIRECTION] 速度 [SPEED] 运动",
      "category": "motion",
      "arguments": {
        "DIRECTION": {"type": "number", "defaultValue": 0},
        "SPEED": {"type": "number", "defaultValue": 50}
      }
    }
  ]
}
```

当前支持的 `blockType`：

| 类型 | 说明 |
| - | - |
| `hat` | 帽子积木，例如“当启动时”“主程序” |
| `command` | 命令积木，生成一行或多行 Python 语句 |
| `reporter` | 圆角返回值积木，生成 Python 表达式 |
| `boolean` | 六边形布尔积木，生成 Python 条件表达式 |

当前支持的参数类型：

| 类型 | 说明 |
| - | - |
| `string` | 字符串或通用文本输入 |
| `number` | 数字输入 |
| `boolean` | 布尔输入 |

## 5. generator/python.json

`generator/python.json` 定义每个 opcode 如何生成 Python。

```json
{
  "imports": [
    "import Hiwonder",
    "import Hiwonder_DEV",
    "import time"
  ],
  "launcher": "Hiwonder.startMain({MAIN})",
  "blocks": {
    "main": {
      "template": "",
      "section": "main"
    },
    "when_start": {
      "template": "",
      "section": "setup"
    },
    "move_dir": {
      "variables": [
        "mecanumCar = Hiwonder_DEV.DEV_MecanumCar( )"
      ],
      "template": "mecanumCar.move_dir({DIRECTION}, {SPEED})"
    }
  }
}
```

模板规则：

- `{DIRECTION}` 这种占位符必须对应 `blocks.json` 里的参数名。
- `imports` 会自动汇总到 Python 顶部。
- `variables` 会自动汇总到 `# initialize variables` 区。
- `section: "setup"` 的帽子积木下方语句生成到主函数之前。
- `section: "main"` 的帽子积木下方语句生成到 `def start_main()` 里。
- `launcher` 里的 `{MAIN}` 会替换成实际主函数名，例如 `start_main`、`start_main1`。
- `runtimeFiles` 会被读取并保存到内部 manifest，给后续“运行前写入 Python 工作目录”使用。

## 6. 与旧 WonderCam 的关系

旧 WonderCam 结构通常有：

```text
config.json
WonderCam.xml
block/WonderCam.js
generator/WonderCam.js
libraries/wondercam.py
media/*.png
css/*.css
```

本轮只参考“一个产品一个目录、积木定义和生成器分离、运行库单独放 libraries”的组织方式。

不会直接执行或解析旧文件：

- 不执行 `block/WonderCam.js`。
- 不执行 `generator/WonderCam.js`。
- 不解析旧 XML toolbox。
- 不兼容 `goog.provide`、`Blockly.Blocks`、`Blockly.Python.forBlock`。

如果要迁移旧库，建议后续做转换器，把旧 JS/XML 转成新版 `blocks.json` 和 `generator/python.json`。

## 7. 当前示例包

当前保留一个真实产品语法示例：

```text
dosc/plans/extension-library/examples/ai-mecanum-package-v2/
```

它从旧 `D:\google download\python-generator.js` 中迁移 `aimecanum_*` 相关语法，覆盖：

- 主程序 / 当启动时帽子积木。
- 麦轮车运动、停止、转向、电机速度。
- 超声波距离、超声波灯光。
- 巡线状态和偏移量。
- 电池电量。
- 蜂鸣器和低电压报警。

## 8. 人工测试用例

### 用例 1：导入旧 v1 JSON

1. 打开 Python 模式。
2. 打开 **Manage Libraries**。
3. 选择旧版 `.custom-extension.json`。
4. 预期：导入成功，扩展分类出现，自定义积木能生成 Python。

### 用例 2：导入新版 zip/sbext

1. 把 `examples/ai-mecanum-package-v2/` 目录内容压缩成 zip。
2. 把后缀改成 `.sbext`，或直接保留 `.zip`。
3. 在库管理器导入。
4. 预期：Python 页签出现 `AI 机甲麦轮车`。
5. 打开扩展库添加该库。
6. 拖入“当启动时”“主程序”和运动/蜂鸣器积木。
7. 预期：代码区生成 imports、初始化变量区、主函数、`Hiwonder.startMain(start_main)`。

### 用例 3：多个主程序

1. 拖入两个 `主程序` 帽子积木。
2. 每个主程序下面放不同积木。
3. 预期：生成 `start_main`、`start_main1`，并分别调用 `Hiwonder.startMain(...)`。

### 用例 4：缺少 generator

1. 删除 zip 内 `generator/python.json`。
2. 重新导入。
3. 预期：弹出错误提示，指出缺少 `generator/python.json`。

### 用例 5：模板参数写错

1. 在 `generator/python.json` 写 `{BAD_NAME}`。
2. 重新导入。
3. 预期：弹出错误提示，指出积木引用了未定义参数。

## 9. 已知限制

- 当前只支持声明式 JSON，不支持执行用户 JS。
- `libraries/*.py` 已经随包读取并保存，但运行时写入 Python 工作目录还没有接。
- `categories` 目前主要用于包结构和后续分组，Scratch 扩展面板里仍按一个扩展分类显示。
- `media/icon.png` 当前没有自动转成图标 URI，后续可补。
- 导出按钮目前导出归一化 JSON，不会重新打包成 `.sbext`。
- 菜单、颜色选择器、角度选择器等高级参数类型还没做。
