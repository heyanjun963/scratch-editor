# Python 积木分类和语法完善方案

## 背景

当前代码模式已经能做到：

```text
Python 扩展积木 -> 生成 Python 文本 -> 本机 Python 运行 -> 终端输出
```

但现有 Python 积木还是最小 Demo 状态。所有语法都堆在 `Python` 一个分类里，和竞品截图相比缺少清晰的教学分类。

竞品截图里的分类更接近：

- 控制
- 运算符
- 数字
- 文本
- 变量
- 函数
- 高级类型
- Python

这说明下一阶段重点不是先补 UI 外观，而是把 Python 语法体系拆清楚。

## 当前代码位置

Python 积木定义：

```text
packages/scratch-vm/src/extensions/scratch3_python_native/index.js
```

Python 代码生成：

```text
packages/scratch-gui/src/lib/python-codegen/index.js
```

Python 模式下过滤工具箱：

```text
packages/scratch-gui/src/containers/blocks.jsx
```

扩展库入口：

```text
packages/scratch-gui/src/lib/libraries/extensions/index.jsx
```

## 当前已有能力

现有 `pythonNative` 扩展已经有这些块：

- `print`
- `sleep`
- `randomInteger`
- `currentTime`
- `setVariable`
- `getVariable`
- `arithmetic`
- `compare`
- `join`
- `toNumber`
- `toString`
- `makeList`
- `length`
- `ifThen`
- `forRange`

对应 codegen 已经能生成：

- `print(...)`
- `time.sleep(...)`
- 变量赋值
- 算术表达式
- 比较表达式
- 字符串拼接
- `float(...)`
- `str(...)`
- list literal
- `len(...)`
- `if`
- `for range`
- `random.randint(...)`
- `time.strftime(...)`

## 主要缺口

### 1. 分类不完善

现在 Python 模式只显示一个 `Python` 分类。

这会导致两个问题：

1. 新手不知道语法块之间的关系。
2. 后续积木变多以后，单分类会非常难找。

### 2. 控制语法不足

需要补：

- Python 主程序开始
- 无限循环
- 重复 N 次
- while 条件循环
- if / else
- break
- continue
- return

### 3. 变量语法不足

需要补：

- 创建变量入口
- 设置变量
- 变量增加
- 获取变量
- 全局变量 / 局部变量暂不做复杂区分

### 4. 函数语法不足

需要补：

- 定义函数
- 调用函数
- 带参数函数
- 返回值函数

第一版可以先只做无参数函数和一个参数函数。

### 5. 高级类型不足

需要补：

- list 创建
- list append
- list get item
- dict 创建
- dict get
- dict set

第一版建议只做 list。

### 6. Python 原生能力不足

需要补：

- import 模块
- 调用内置函数
- input 输入
- try/except 暂不优先

## 推荐分类设计

第一阶段推荐先做 6 个分类：

| 分类 | 颜色 | 内容 |
| - | - | - |
| 控制 | 橙色 | 主程序、if、if else、repeat、while、break、continue |
| 运算符 | 绿色 | 算术、比较、and、or、not |
| 文本 | 紫色 | 文本、拼接、长度、转字符串 |
| 变量 | 红色 | set、change、get |
| 列表 | 蓝色 | list、append、get、len |
| Python | 深蓝 | print、sleep、input、import、random、time |

后续再扩：

- 数字
- 函数
- 字典
- 文件
- 硬件

## 技术实现建议

### 推荐做法

不要继续把所有块堆在一个 `pythonNative` 分类里。

更推荐拆成多个 Python 扩展分类，但仍放在同一个 VM extension 文件里维护。

可选方案：

1. 一个扩展，多个 category 输出。
2. 多个扩展：`pythonControl`、`pythonOperators`、`pythonVariables` 等。

当前项目改动最小的是方案 2：

```text
scratch3_python_control
scratch3_python_operators
scratch3_python_variables
scratch3_python_text
scratch3_python_list
scratch3_python_native
```

这样可以复用原版扩展分类机制，左侧自然出现多个分类。

### codegen 设计

`python-codegen/index.js` 需要从一个前缀扩展到多个前缀：

```text
pythonControl_
pythonOperators_
pythonVariables_
pythonText_
pythonList_
pythonNative_
```

但不要让 `switch` 无限膨胀。建议拆文件：

```text
packages/scratch-gui/src/lib/python-codegen/
├── index.js
├── expressions.js
├── statements.js
├── names.js
└── imports.js
```

第一版可以先不拆，等分类稳定后再拆。

## 第一阶段建议实现

先补最小可演示闭环：

1. 左侧拆出多个 Python 分类。
2. 控制分类：
   - 主程序开始
   - if
   - repeat N
   - while
3. 运算符分类：
   - `+ - * /`
   - `< <= = >= >`
   - and / or / not
4. 变量分类：
   - set
   - change by
   - get
5. Python 分类：
   - print
   - sleep
   - input
6. 代码生成覆盖以上积木。

## 本轮已实施范围

本轮按“先补基础语法分类”的思路落地，并追加函数积木 MVP。暂不做字典、文件、异常、类和硬件 API。

新增 VM 内置扩展分类：

```text
packages/scratch-vm/src/extensions/scratch3_python_control
packages/scratch-vm/src/extensions/scratch3_python_operators
packages/scratch-vm/src/extensions/scratch3_python_variables
packages/scratch-vm/src/extensions/scratch3_python_text
packages/scratch-vm/src/extensions/scratch3_python_list
packages/scratch-vm/src/extensions/scratch3_python_function
```

代码模式下会自动加载这些分类：

```text
pythonControl
pythonOperators
pythonText
pythonVariables
pythonList
pythonFunction
pythonNative
```

旧的 `pythonNative` 仍保留原有 opcode，目的是兼容已经保存过的 `.sb3` 项目。重复的变量、运算、文本、列表块已从侧栏隐藏，避免新工具箱出现两套相似积木。

### 当前分类和积木

| 分类 | 扩展 ID | 当前积木 |
| - | - | - |
| 控制 | `pythonControl` | Python main、repeat、forever、while、if、if else、break、continue |
| 运算符 | `pythonOperators` | 算术、比较、and/or、not |
| 文本 | `pythonText` | 文本字面量、join、length、转字符串 |
| 变量 | `pythonVariables` | set、change by、get |
| 列表 | `pythonList` | list、append、get item、length |
| 函数 | `pythonFunction` | define function、call function、function reporter、return、parameter |
| Python | `pythonNative` | print、sleep、input、number、random integer、current time |

函数分类当前仍是 MVP，不是完整函数系统。它可以演示函数定义、调用、参数读取、返回值和折叠入口，但还缺少可视化参数编辑、参数类型校验、重名检查、调用块自动同步参数、函数重命名联动、保存恢复完整验证等能力。

工具栏禁用样例：当前 Python 分类里的 `current time` 积木在左侧工具栏中会被禁用。它仍然可见，但应置灰、显示红色禁止样式、不可拖到画布，并提示“当前时间积木暂未开放”。这只是禁用能力的第一版样例，后续需要改成由产品配置、设备连接状态或权限状态统一控制。

### 代码生成覆盖

代码生成入口仍是：

```text
packages/scratch-gui/src/lib/python-codegen/index.js
```

现在支持这些前缀：

```text
pythonControl_
pythonOperators_
pythonVariables_
pythonText_
pythonList_
pythonFunction_
pythonNative_
```

生成规则仍然是“积木工作区 -> 遍历顶层积木栈 -> 表达式/语句转换 -> 拼接 Python 文本”。它没有调用本机 Python 环境。本机 Python 只在点击运行按钮后，由桌面端执行生成出来的临时 `.py` 文件。

## 人工验证

### 基础验证

1. 运行 `npm run desktop`。
2. 进入代码模式。
3. 左侧只显示 Python 相关分类，不显示原版 Scratch 运动、外观、声音等分类。
4. 左侧能看到：控制、运算符、文本、变量、列表、Python。
5. 不需要再去扩展库手动添加 Python 扩展。
6. Python 分类里的 `current time` 积木显示为禁用状态和红色禁止样式，不能从工具栏拖入画布。

### 用例 1：变量 + if else + print

拖拽结构：

```text
Python main
  set score to 80
  if score >= 60 else
    print "pass"
    print "fail"
```

期望生成：

```python
def start_main():
    score = 80
    if score >= 60:
        print("pass")
    else:
        print("fail")

start_main()
```

运行期望：

```text
pass
```

### 用例 2：repeat + print

```python
def start_main():
    for i in range(3):
        print("hello")

start_main()
```

运行期望：

```text
hello
hello
hello
```

### 用例 3：列表 append + len

拖拽结构：

```text
Python main
  set items to list "a" "b" "c"
  append "apple" to list items
  print length of list items
```

期望生成：

```python
def start_main():
    items = ["a", "b", "c"]
    items.append("apple")
    print(len(items))

start_main()
```

运行期望：

```text
4
```

### 用例 4：input + print

拖拽结构：

```text
Python main
  set name to input "name: "
  print variable name
```

期望生成：

```python
def start_main():
    name = input("name: ")
    print(name)

start_main()
```

运行期望：

1. 终端出现 `name: `。
2. 手动输入内容并回车。
3. 终端打印刚输入的内容。

### 用例 5：while / forever 风险验证

`forever` 会生成 `while True:`。如果内部没有退出条件，点击运行会持续占用终端。

验证时建议：

1. 先只拖 `repeat`。
2. 确认停止按钮可中断运行。
3. 再测试 `forever`。

### 用例 6：函数定义、调用和折叠

拖拽结构：

```text
define function my_function params name
  print parameter name

Python main
  call function my_function args "Scratch"
```

期望生成：

```python
def my_function(name):
    print(name)

def start_main():
    my_function("Scratch")

start_main()
```

运行期望：

```text
Scratch
```

折叠验证：

1. 右键 `define function my_function params name`。
2. 点击“折叠函数”。
3. 函数定义块应缩小，只显示摘要。
4. 再次右键点击“展开函数”。
5. 函数体内的 `print parameter name` 仍然存在。
6. 折叠前后右侧 Python 代码不应变化。

## 当前结论

下一阶段应该继续补齐“Python 分类体系 + 常用语法块”，并把函数参数编辑体验从文本输入升级为更接近 Scratch 自制积木的可视化参数编辑。

保存恢复先复用原版 `.sb3`，不要再做自定义 JSON 项目格式。

后续再补：

- 函数参数可视化编辑。
- 字典、集合、元组等高级类型。
- 文件读写。
- try/except。
- 公司硬件 API。
- 生成代码的单元测试。
