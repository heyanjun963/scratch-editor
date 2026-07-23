# Mind+ 兼容测试包

这里保存后续 Mind+ 兼容解析器使用的固定输入样本。

| 目录 | 覆盖范围 |
| - | - |
| `aidoggy-python-fixture` | AiDoggy 17 个 Python 积木、8 个菜单、多语言和产品生成规则 |
| `python-basic-fixture` | Python 资源、菜单、多语言、pip 依赖、本地 Python 库和基础生成器调用 |

测试包仅用于格式兼容验证，尚未完成人工校对和 AiDoggy 真机验证，不能作为产品库发布。当前软件已支持导入本文所列的 Mind+ Python 兼容子集。

重新生成确定性压缩包：

```powershell
node packages/scratch-gui/scripts/pack-mindplus-fixtures.mjs
```

输出位于 `dist/`。修改任一源文件后必须重新运行命令，并执行对应 Jest 测试。
