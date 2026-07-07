# 10 旧产品拓展迁移计划

> 类型：旧产品迁移 + Python 生成器架构方案
> 参考来源：
> - 旧产品积木：`D:\qq download\scratch-vm\scratch-vm\src\extensions`
> - 旧 Python 生成器：`D:\google download\python-generator (1).js`

---

## 1. 目标

把旧版公司产品拓展迁移到当前 `scratch-editor` 的 Python 编码模式中。

迁移后的目标形态是：

```text
旧产品 extension/index.js
    -> 规范化为新版产品/模块拓展包 manifest
    -> 在 Python 拓展页面展示为主控扩展或模块扩展
    -> 点击加载后注册 VM extension
    -> 左侧工具箱出现对应积木分类
    -> 拖拽积木后由 Python codegen 生成可运行 Python
```

这次迁移不建议把旧 `python-generator (1).js` 直接复制进项目。它是 2 万多行单文件，所有产品逻辑堆在一起，后续维护会很痛。建议把它拆成“公共生成器运行时 + 产品生成器模块 + 拓展包 manifest”。

---

## 2. 当前扫描结论

### 2.1 旧产品目录

旧 `extensions` 目录里既有 Scratch 官方拓展，也有公司产品和模块拓展。公司相关目录主要分三类：

| 类型 | 目录示例 | 说明 |
| - | - | - |
| 主控/机器人产品 | `aimecanum`、`aimech`、`aihexa`、`aiquadruped`、`tonybot`、`mechdog`、`qbot` | 应展示在“主控扩展”或“机器人”分类里 |
| 控制器产品 | `aiblocksboard`、`corex`、`smallc`、`midc`、`largec`、`microbit_python` | 应展示在“主控扩展/控制器”分类里 |
| 公共模块 | `sensor`、`actuator`、`display`、`communication`、`function_module` | 应展示在“模块扩展”分类里，并受当前主控兼容关系控制 |

### 2.2 旧积木规模

抽样统计：

| 目录 | 积木数 | 帽子块数 | 菜单 |
| - | -: | -: | - |
| `sensor` | 314 | 0 | 有 |
| `actuator` | 79 | 0 | 有 |
| `aimecanum` | 66 | 4 | 有 |
| `display` | 59 | 0 | 有 |
| `aimech` | 48 | 4 | 有 |
| `aiquadrupedpro` | 45 | 4 | 有 |
| `midc` / `largec` | 45 | 4 | 有 |
| `mechdog` | 44 | 4 | 有 |
| `aihexa` | 43 | 4 | 有 |
| `tonybot` | 40 | 5 | 有 |
| `communication` | 23 | 2 | 有 |

结论：公共模块比单个产品更大，不能一上来全量迁移。第一阶段应先选一个产品闭环，例如 `aimecanum`。

### 2.3 旧产品积木结构

旧产品的 `index.js` 主要提供 UI 元数据：

```js
{
    opcode: 'set_motor_speed_all',
    text: '设置四个电机速度 ...',
    blockType: BlockType.COMMAND,
    customID: 'aimecanum',
    arguments: {
        SPEED1: {type: ArgumentType.NUMBER, defaultValue: 60}
    }
}
```

关键字段映射：

| 旧字段 | 新 manifest 字段 |
| - | - |
| `id` | `id` |
| `name` | `name` |
| `color1/color2` | `color` |
| `blocks[].opcode` | `blocks[].opcode` |
| `blocks[].text` | `blocks[].text` |
| `blocks[].blockType` | `blocks[].blockType` |
| `blocks[].arguments` | `blocks[].arguments` |
| `menus` | `menus` |
| `subCategory` | `blocks[].category` 或 `sections[]` |
| `customID` | `codegen.prefix` 或 `compat.productId` |

### 2.4 旧 Python 生成器结构

旧生成器核心是：

```text
Blockly.Python.xxx_opcode = function (block) { ... }
```

例如 `aimecanum`：

```text
Blockly.Python.aimecanum_start_thread
Blockly.Python.aimecanum_start_run_thread
Blockly.Python.aimecanum_buzzer_tone_set
Blockly.Python.aimecanum_set_motor_speed_all
Blockly.Python.aimecanum_move_oriention
```

它还依赖一组全局收集器：

| 方法/字段 | 作用 |
| - | - |
| `addImport(tag, code)` | 去重收集 import |
| `addVariable(tag, code)` | 去重收集硬件对象初始化 |
| `addSetup(tag, code)` | 收集 setup 代码 |
| `addFunction(tag, code)` | 收集辅助函数 |
| `finish(code)` | 拼接 import、变量、函数、setup、主程序 |
| `addThreadDefineToCode` | 处理 `@Hiwonder.start_main` / 事件线程 |
| `addThreadTag` | 追加 `Hiwonder.startMain(start_main)` 等启动调用 |

旧版输出不是简单模板替换。它包含：

1. `import Hiwonder`
2. `import Hiwonder_DEV`
3. `beep = Hiwonder.Buzzer()`
4. `mecanumCar = Hiwonder_DEV.DEV_MecanumCar()`
5. `def start_main():`
6. `global beep`
7. `global mecanumCar`
8. `Hiwonder.startMain(start_main)`

所以新版必须补一个“Python 生成上下文”，不能只靠当前简单 `template`。

---

## 3. 迁移原则

### 3.1 不直接搬旧单文件生成器

旧生成器可作为语义参考，但不要整体塞进项目。

原因：

- 单文件 2 万多行，产品耦合严重。
- 很多逻辑依赖 Blockly 旧 API。
- 部分函数有历史问题，例如变量未定义、重复产品段、旧板卡兼容分支。
- 后续如果公司继续新增产品，会再次变成不可维护大表。

### 3.2 新版按拓展包维护产品能力

每个产品或模块应能独立维护：

```text
custom-extension-libraries/
└── aimecanum/
    ├── manifest.json
    ├── generator.js
    ├── runtime/
    └── assets/
```

编辑器只维护：

- 拓展包解析
- manifest 校验
- VM 注册
- Python 生成上下文
- 云端/本地库管理

产品团队后续主要维护拓展包。

### 3.3 先闭环，再铺量

建议第一条闭环选 `aimecanum`。

原因：

- 用户之前已经重点讨论 AI 机甲麦轮车。
- 旧生成器里 `aimecanum` 覆盖了启动、蜂鸣器、按键、电机、IMU、RGB、巡线、舵机等典型场景。
- 能验证主控产品、公共硬件初始化、主函数、事件线程和运动控制。

---

## 4. 新架构方案

### 4.1 拓展包结构

建议新版 `.sbext` 支持下面结构：

```text
aimecanum.sbext
├── manifest.json
├── generator.js
├── assets/
│   └── icon.png
└── examples/
    ├── basic-move.sb3
    └── buzzer.sb3
```

### 4.2 manifest 扩展字段

在现有自定义拓展 manifest 基础上，补充产品迁移需要的字段：

```json
{
  "schemaVersion": 2,
  "id": "aimecanum",
  "name": "AI机甲麦轮车",
  "kind": "product",
  "category": "robots",
  "version": "1.0.0",
  "runtime": {
    "language": "python",
    "imports": ["import Hiwonder", "import time", "import Hiwonder_DEV"],
    "startup": "hiwonder-thread"
  },
  "compat": {
    "products": ["aimecanum"],
    "modules": ["sensor", "actuator", "display", "communication"]
  },
  "blocks": [],
  "menus": {},
  "codegen": {
    "entry": "generator.js",
    "prefix": "aimecanum"
  }
}
```

### 4.3 generator.js 结构

每个产品生成器导出结构化函数：

```js
module.exports = {
    start_thread (block, ctx) {
        ctx.addImport('hiwonder', 'import Hiwonder');
        ctx.addImport('time', 'import time');
        ctx.addImport('iic', 'import Hiwonder_DEV');
        return ctx.startMain('start_main', block);
    },

    set_motor_speed_all (block, ctx) {
        ctx.addVariable('mecanumCar', 'mecanumCar = Hiwonder_DEV.DEV_MecanumCar()');
        const speed1 = ctx.valueToCode(block, 'SPEED1', '0');
        const speed2 = ctx.valueToCode(block, 'SPEED2', '0');
        const speed3 = ctx.valueToCode(block, 'SPEED3', '0');
        const speed4 = ctx.valueToCode(block, 'SPEED4', '0');
        return `  mecanumCar.set_motors_speed(${speed4},${speed3},${speed2},${speed1})\n`;
    }
};
```

注意：这里不是让用户写复杂 JS。旧产品由我们迁移，普通用户仍可以用简单模板。

### 4.4 PythonCodegenContext

当前项目需要新增一个上下文对象，用来替代旧 `Blockly.Python` 全局状态。

建议能力：

| 方法 | 作用 |
| - | - |
| `addImport(key, code)` | 去重 import |
| `addVariable(key, code)` | 去重初始化变量 |
| `addSetup(key, code)` | 去重 setup |
| `addFunction(key, code)` | 去重辅助函数 |
| `valueToCode(block, inputName, fallback)` | 生成输入参数代码 |
| `statementToCode(block, inputName)` | 生成子语句代码 |
| `startMain(name, block)` | 生成主函数帽子块 |
| `startRun(name, block)` | 生成启动事件帽子块 |
| `finish(code)` | 拼接最终 Python 文件 |

最终生成顺序：

```text
imports

# initialize variables
variables

# define functions
functions

setup

def start_main():
  global xxx
  ...

Hiwonder.startMain(start_main)
```

如果存在多个主函数：

```text
def start_main():
  ...

def start_main1():
  ...

Hiwonder.startMain(start_main)
Hiwonder.startMain(start_main1)
```

这和旧版“多个主函数生成 start_main1，再启动一次”的行为保持一致。

---

## 5. 迁移流程

### 阶段 1：迁移工具链

先做工具，不急着迁所有产品。

要做：

1. 写 `legacy-extension-extractor`，从旧 `index.js` 提取：
   - `id`
   - `name`
   - `color`
   - `blocks`
   - `menus`
   - `subCategory`
2. 输出新版 `manifest.json` 草稿。
3. 输出待人工确认清单：
   - 不支持的 `ArgumentType`
   - 不支持的 `BlockType`
   - 旧字段 `customID`
   - 菜单函数
   - 动态菜单

产物示例：

```text
custom-extension-libraries/aimecanum/manifest.json
custom-extension-libraries/aimecanum/migration-report.md
```

### 阶段 2：Python 生成上下文

补齐当前 Python codegen 的短板。

要做：

1. 新增 `PythonCodegenContext`。
2. 支持 `imports/variables/functions/setups/threadTags`。
3. 支持帽子块生成主函数。
4. 支持多个主函数去重命名。
5. 支持 `global` 自动注入。
6. 保留现有简单模板能力。
7. 增加产品 generator.js 插件能力。

验收标准：

旧示例：

```text
主程序
  蜂鸣器播放
  麦轮车四轮速度
```

应生成：

```python
import Hiwonder
import time
import Hiwonder_DEV

# initialize variables
beep = Hiwonder.Buzzer()
mecanumCar = Hiwonder_DEV.DEV_MecanumCar()

def start_main():
  global beep
  global mecanumCar
  beep.playTone(65,500,False)
  mecanumCar.set_motors_speed(60,60,60,60)

Hiwonder.startMain(start_main)
```

### 阶段 3：迁移 `aimecanum` 闭环

优先迁移 AI 机甲麦轮车。

建议先迁这些积木：

| 类别 | 积木 |
| - | - |
| 启动 | `start_thread`、`start_run_thread` |
| 调试 | `print_str`、`print_number` |
| 蜂鸣器 | `buzzer_tone_set`、`buzzer_tone_set_arg`、`buzzer_tone_set_volume`、`close_buzzer` |
| 电机 | `set_motor_speed_all`、`set_motor_speed_one`、`move_oriention`、`move_stop` |
| 电量 | `get_battery_level` |

先不迁全部 66 个。先保证工具箱、拖拽、代码生成、运行、上传入口都走通。

### 阶段 4：迁移公共模块

按价值拆公共模块：

1. `sensor`：传感器类，数量最多，先迁常用巡线、超声波、颜色识别。
2. `actuator`：舵机、机械臂、执行器。
3. `display`：RGB、点阵、数码管、风扇等输出模块。
4. `communication`：蓝牙、串口、通信事件。
5. `function_module`：如果旧目录只有菜单或公共定义，先作为依赖模块处理。

公共模块必须加 `compat.products`，不支持当前主控时在拓展页面置灰。

### 阶段 5：批量迁移主控产品

建议顺序：

| 优先级 | 产品 | 原因 |
| - | - | - |
| P0 | `aimecanum` | 先打通完整闭环 |
| P1 | `aimech`、`aiblocksboard` | 和当前讨论最多，硬件能力典型 |
| P1 | `smallc`、`midc`、`largec` | 控制器类可复用麦轮/模块能力 |
| P2 | `mechdog`、`tonybot`、`aihexa` | 机器人类，需要动作组和姿态类生成 |
| P2 | `aiquadruped`、`aiquadrupedpro`、`aidoggy` | 多足机器人，验证复杂运动参数 |
| P3 | `qbot`、`minihexa`、`ainova*` | 后续按产品计划补齐 |

---

## 6. 文件落点建议

### 6.1 编辑器代码

```text
packages/scratch-vm/src/codegen/python/
├── index.js
├── context.js
├── legacy-runtime.js
└── product-generators/
    └── README.md
```

职责：

- `context.js`：管理 import、变量、函数、主函数、线程。
- `legacy-runtime.js`：提供旧 Blockly.Python 常用 helper 的兼容层。
- `index.js`：遍历 VM blocks，调用对应 generator。

### 6.2 拓展包

```text
custom-extension-libraries/
└── aimecanum/
    ├── manifest.json
    ├── generator.js
    ├── icon.png
    └── migration-report.md
```

职责：

- `manifest.json`：积木、菜单、分类、兼容关系。
- `generator.js`：产品专属 Python 生成逻辑。
- `migration-report.md`：旧版迁移差异记录。

### 6.3 拓展库页面

```text
packages/scratch-gui/src/components/product-extension-library/
packages/scratch-gui/src/lib/custom-extension/
```

补充：

- 根据 `kind` 分主控/模块。
- 根据 `compat.products` 置灰不兼容模块。
- 根据 `version/latestVersion` 显示更新状态。
- 支持加载本地和云端 `.sbext`。

---

## 7. 风险和处理

| 风险 | 影响 | 处理 |
| - | - | - |
| 旧 `ArgumentType` 新项目不全支持 | 积木渲染失败 | 先做类型映射表，不支持的标红进入报告 |
| 动态菜单依赖运行时 | 菜单数据丢失 | 第一阶段静态化，第二阶段支持菜单函数 |
| 旧生成器依赖 Blockly API | 不能直接运行 | 通过 `PythonCodegenContext` 提供兼容方法 |
| 多主函数/事件线程复杂 | Python 结构不对 | 优先复刻旧 `finish` 输出规则 |
| 公共模块兼容关系缺失 | 不支持模块被误选 | manifest 加 `compat.products`，页面置灰 |
| 旧代码存在 bug | 迁移后复现问题 | 建 migration-report，逐块人工确认 |
| 硬件 Python 包未安装 | 本机运行失败 | 代码生成测试和硬件运行测试分开 |

---

## 8. 测试计划

### 8.1 自动测试

每个产品至少有 3 类测试：

1. manifest 校验测试。
2. VM extension 注册测试。
3. Python 代码生成快照测试。

示例：

```text
aimecanum/basic-start.snapshot
aimecanum/buzzer.snapshot
aimecanum/motor.snapshot
```

### 8.2 人工测试

第一轮人工验证 `aimecanum`：

1. 启动桌面端。
2. 进入 Python 模式。
3. 打开拓展页面。
4. 选择 **AI机甲麦轮车**。
5. 左侧出现 `aimecanum` 积木分类。
6. 拖入 `主程序`。
7. 放入蜂鸣器和四轮速度积木。
8. 右侧 Python 区生成 `import Hiwonder`、`import Hiwonder_DEV`。
9. 生成 `beep = Hiwonder.Buzzer()`。
10. 生成 `mecanumCar = Hiwonder_DEV.DEV_MecanumCar()`。
11. 生成 `def start_main():`。
12. 生成 `Hiwonder.startMain(start_main)`。
13. 多放一个 `主程序`，确认生成 `start_main1` 并再次启动。

---

## 9. 里程碑

### M1：迁移基础设施

产出：

- `PythonCodegenContext`
- 旧 helper 兼容层
- manifest v2 字段
- 旧 extension 提取脚本草案

完成标准：

- 当前简单模板库仍可用。
- 新 generator.js 插件能参与代码生成。

### M2：`aimecanum` 最小闭环

产出：

- `aimecanum` manifest
- `aimecanum` generator
- 10 个左右核心积木
- 快照测试

完成标准：

- UI 加载、工具箱显示、拖拽、代码生成、桌面端运行链路走通。

### M3：公共模块第一批

产出：

- `sensor` 常用积木
- `actuator` 常用积木
- `display` 常用积木
- 兼容关系置灰

完成标准：

- 未选择主控时模块不可用。
- 选择 `aimecanum` 后支持模块可加载。

### M4：批量产品迁移

产出：

- `aimech`
- `aiblocksboard`
- `smallc/midc/largec`
- 后续机器人产品

完成标准：

- 每个产品都有 manifest、generator、测试快照、迁移差异记录。

---

## 10. 下一步建议

下一步先不要批量搬全部旧产品。

建议先做两个基础任务：

1. 在当前 Python codegen 中实现 `PythonCodegenContext`，让它支持旧生成器的 `imports/variables/functions/startMain` 模型。
2. 手工迁移 `aimecanum` 的 10 个核心积木，验证从拓展页面到 Python 生成结果的完整链路。

等 `aimecanum` 闭环稳定后，再写提取脚本批量转换旧 `index.js` 的积木元数据。

---

## 11. 2026-07-07 实施记录

已完成第一步基础设施：

- 新增 `packages/scratch-vm/src/codegen/python/context.js`。
- 将原来散在 `python.js` 里的 `imports`、`variables`、`setups`、`launcher` 和最终拼装逻辑收敛到 `PythonCodegenContext`。
- 保留现有简单模板库能力，当前 `codegen-registry` 的 `template/imports/variables/setups/launcher` 仍可继续工作。
- 新增 `packages/scratch-vm/test/unit/python_codegen.js`，覆盖自定义主函数、硬件变量初始化、`global` 注入、launcher 和多个主函数命名。

下一步进入 `aimecanum` 最小闭环：

1. 新增产品 generator 接入点。
2. 迁移 `start_thread` / `start_run_thread`。
3. 迁移蜂鸣器、打印、电机移动等第一批核心积木。
4. 用快照测试锁定旧版期望的 Python 输出。
