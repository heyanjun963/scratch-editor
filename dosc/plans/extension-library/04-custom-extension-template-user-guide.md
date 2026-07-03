# 自定义积木模板用户教学

> 类型：用户教学 + 配置参考。
> 面向对象：想自己添加 Python 自定义积木，但不想改源码的老师、产品人员、课程开发人员。
> 适用范围：当前 MVP 的 `manifest.json` 自定义拓展库。

---

## 1. 先理解一句话

自定义积木不是写 JS 代码，而是写一个 JSON 配置文件。

你在 JSON 里告诉编辑器三件事：

1. 这个拓展库叫什么。
2. 左侧工具栏里要显示哪些积木。
3. 每个积木要生成什么 Python 代码。

核心就是这一段：

```json
"codegen": {
  "python": {
    "template": "print({TEXT})",
    "imports": []
  }
}
```

`template` 就是 Python 代码模板。`{TEXT}` 是占位符，运行时会替换成用户在积木里输入的值。

---

## 2. 最小可用示例

新建一个文件，名字可以叫：

```text
companydemo.json
```

内容：

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
    }
  ]
}
```

导入后会出现一个积木：

```text
打印 [hello custom block]
```

生成的 Python：

```python
print("hello custom block")
```

---

## 3. 整体文件结构

```json
{
  "formatVersion": 1,
  "id": "companydemo",
  "name": "公司演示库",
  "version": "1.0.0",
  "color1": "#4C97FF",
  "color2": "#3373CC",
  "color3": "#285CA3",
  "blocks": []
}
```

字段说明：

| 字段 | 必填 | 说明 |
| - | - | - |
| `formatVersion` | 是 | 固定写 `1` |
| `id` | 是 | 拓展库唯一 ID，只能用小写字母和数字 |
| `name` | 是 | 扩展库显示名称 |
| `version` | 是 | 版本号，例如 `1.0.0` |
| `color1` | 否 | 积木主色 |
| `color2` | 否 | 积木阴影色 |
| `color3` | 否 | 积木边缘色 |
| `blocks` | 是 | 积木列表 |

`id` 示例：

```json
"id": "companydemo"
```

不要写：

```json
"id": "company-demo"
```

因为 `-` 暂不支持。

---

## 4. 一个积木怎么写

一个积木长这样：

```json
{
  "opcode": "print_text",
  "blockType": "command",
  "text": "打印 [TEXT]",
  "arguments": {
    "TEXT": {
      "type": "string",
      "defaultValue": "hello"
    }
  },
  "codegen": {
    "python": {
      "template": "print({TEXT})",
      "imports": []
    }
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
| - | - | - |
| `opcode` | 是 | 积木唯一名称，只能用小写字母、数字、下划线 |
| `blockType` | 是 | 积木类型 |
| `text` | 是 | 积木显示文案 |
| `arguments` | 否 | 积木参数 |
| `codegen.python.template` | 是 | 生成 Python 的模板 |
| `codegen.python.imports` | 否 | 需要自动加到顶部的 import |

---

## 5. 积木类型

当前支持三种常用类型。

### 5.1 command

表示一条语句，可以上下拼接。

示例：

```json
{
  "opcode": "print_text",
  "blockType": "command",
  "text": "打印 [TEXT]",
  "arguments": {
    "TEXT": {
      "type": "string",
      "defaultValue": "hello"
    }
  },
  "codegen": {
    "python": {
      "template": "print({TEXT})",
      "imports": []
    }
  }
}
```

生成：

```python
print("hello")
```

### 5.2 reporter

表示一个有返回值的表达式，可以塞进别的积木参数里。

示例：

```json
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
}
```

生成：

```python
(1 + 2)
```

建议表达式模板自己加括号，例如 `({A} + {B})`，可以减少优先级问题。

### 5.3 boolean

表示真假判断，可以放进条件积木里。

示例：

```json
{
  "opcode": "greater_than",
  "blockType": "boolean",
  "text": "[A] 大于 [B]",
  "arguments": {
    "A": {
      "type": "number",
      "defaultValue": 10
    },
    "B": {
      "type": "number",
      "defaultValue": 5
    }
  },
  "codegen": {
    "python": {
      "template": "({A} > {B})",
      "imports": []
    }
  }
}
```

生成：

```python
(10 > 5)
```

---

## 6. 参数类型

当前支持三种参数类型。

| 类型 | 用途 | Python 生成效果 |
| - | - | - |
| `string` | 文本 | 自动加引号 |
| `number` | 数字 | 不加引号 |
| `boolean` | 真假 | 生成 `True` 或 `False` |

### 6.1 string

```json
"TEXT": {
  "type": "string",
  "defaultValue": "hello"
}
```

模板：

```json
"template": "print({TEXT})"
```

生成：

```python
print("hello")
```

### 6.2 number

```json
"SECS": {
  "type": "number",
  "defaultValue": 1
}
```

模板：

```json
"template": "time.sleep({SECS})"
```

生成：

```python
time.sleep(1)
```

### 6.3 boolean

```json
"ENABLED": {
  "type": "boolean",
  "defaultValue": true
}
```

模板：

```json
"template": "print({ENABLED})"
```

生成：

```python
print(True)
```

---

## 7. text、arguments、template 必须对齐

这是最容易出错的地方。

正确写法：

```json
"text": "打印 [TEXT]",
"arguments": {
  "TEXT": {
    "type": "string",
    "defaultValue": "hello"
  }
},
"codegen": {
  "python": {
    "template": "print({TEXT})",
    "imports": []
  }
}
```

这里三处都是 `TEXT`：

```text
[TEXT]
TEXT
{TEXT}
```

错误写法：

```json
"text": "打印 [TEXT]",
"arguments": {
  "VALUE": {
    "type": "string",
    "defaultValue": "hello"
  }
},
"codegen": {
  "python": {
    "template": "print({TEXT})",
    "imports": []
  }
}
```

原因：`text` 和 `template` 用的是 `TEXT`，但 `arguments` 里写成了 `VALUE`。

---

## 8. imports 怎么写

如果模板需要 Python 标准库，把 import 写到 `imports`。

示例：等待几秒。

```json
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
```

生成：

```python
import time

time.sleep(1)
```

也可以写完整 import：

```json
"imports": ["from math import sqrt"]
```

生成：

```python
from math import sqrt
```

---

## 9. 多行模板

`template` 可以写多行字符串。JSON 里换行要写成 `\n`。

示例：

```json
{
  "opcode": "print_twice",
  "blockType": "command",
  "text": "打印两次 [TEXT]",
  "arguments": {
    "TEXT": {
      "type": "string",
      "defaultValue": "hello"
    }
  },
  "codegen": {
    "python": {
      "template": "print({TEXT})\nprint({TEXT})",
      "imports": []
    }
  }
}
```

生成：

```python
print("hello")
print("hello")
```

---

## 10. 完整示例：一个小数学库

```json
{
  "formatVersion": 1,
  "id": "mathdemo",
  "name": "数学演示库",
  "version": "1.0.0",
  "color1": "#59C059",
  "color2": "#46A546",
  "color3": "#337F33",
  "blocks": [
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
      "opcode": "square_root",
      "blockType": "reporter",
      "text": "[VALUE] 的平方根",
      "arguments": {
        "VALUE": {
          "type": "number",
          "defaultValue": 9
        }
      },
      "codegen": {
        "python": {
          "template": "sqrt({VALUE})",
          "imports": ["from math import sqrt"]
        }
      }
    },
    {
      "opcode": "print_result",
      "blockType": "command",
      "text": "输出结果 [VALUE]",
      "arguments": {
        "VALUE": {
          "type": "string",
          "defaultValue": "done"
        }
      },
      "codegen": {
        "python": {
          "template": "print({VALUE})",
          "imports": []
        }
      }
    }
  ]
}
```

---

## 11. 导入步骤

1. 进入 Python 编码模式。
2. 打开扩展库。
3. 点击 **Import Custom Library**。
4. 选择你的 `.json` 文件。
5. 点击导入后的库卡片。
6. 左侧工具栏会出现新的积木分类。
7. 拖出积木，右侧代码区会生成 Python。

---

## 12. 常见错误

### 12.1 id 写了横杠

错误：

```json
"id": "my-library"
```

正确：

```json
"id": "mylibrary"
```

### 12.2 opcode 大写

错误：

```json
"opcode": "PrintText"
```

正确：

```json
"opcode": "print_text"
```

### 12.3 参数名不一致

错误：

```json
"text": "打印 [TEXT]",
"arguments": {
  "VALUE": {
    "type": "string",
    "defaultValue": "hello"
  }
},
"template": "print({TEXT})"
```

正确：

```json
"text": "打印 [TEXT]",
"arguments": {
  "TEXT": {
    "type": "string",
    "defaultValue": "hello"
  }
},
"template": "print({TEXT})"
```

### 12.4 JSON 少逗号

JSON 每个字段之间要有逗号。

错误：

```json
{
  "opcode": "print_text"
  "blockType": "command"
}
```

正确：

```json
{
  "opcode": "print_text",
  "blockType": "command"
}
```

---

## 13. 当前限制

- 当前配置文件只支持 `.json`，后续才支持 `.sbext` 压缩包。
- 当前模板只做安全字符串替换，不执行用户 JS。
- 当前适合生成 Python 代码，不适合直接控制 Scratch 舞台角色。
- 复杂控件暂不支持，例如颜色选择器、串口选择器、图像选择器。
- 如果要带 Python 运行库文件，例如 `libraries/*.py`，需要等 `.sbext` 阶段。

---

## 14. 推荐写法

普通用户建议按这个顺序写：

1. 先复制最小示例。
2. 修改 `id`、`name`、颜色。
3. 只添加一个积木。
4. 导入测试。
5. 确认能生成 Python 后，再继续添加更多积木。

不要一开始就写几十个积木。先让一个积木跑通，后面就只是重复填配置。
