# 16 用户拓展分类与产品包来源模型

> 执行日期：2026-07-15
> 本轮目标：把本地导入包从模块拓展中迁出，新增独立“用户拓展”页面，支持加载、卸载和删除；同时预留后台产品包覆盖内置默认配置的来源模型。

## 本轮完成

拓展页面现在分为三类：

```text
主控拓展
模块拓展
用户拓展
```

用户通过 `.json/.zip/.sbext` 导入的包只出现在“用户拓展”，不再混入模块分类。用户包拥有三个独立操作：

- **加载**：注册 VM 积木和 Python codegen 模板。
- **卸载**：移除 VM 积木和模板，但保留已导入包。
- **删除**：卸载运行态并彻底删除本地持久化记录。

URL 导入按钮已按竞品形态预留，目前只提示后续支持 GitHub、Gitee 或公司拓展包地址，不执行虚假的网络加载。

## 用户包状态模型

本地包记录新增 `enabled`：

```json
{
  "enabled": false,
  "manifest": {
    "id": "mydevice",
    "version": "1.0.0"
  }
}
```

含义：

| 状态 | 包是否保留 | VM/codegen 是否注册 |
| - | - | - |
| `enabled: true` | 是 | 是 |
| `enabled: false` | 是 | 否 |
| 删除记录 | 否 | 否 |

旧版本只保存 manifest 的数据会自动迁移为 `enabled: true`。浏览器 localStorage 和 Electron userData 都保存新记录，因此卸载状态可以跨刷新和重启保留。

切换主控时会卸载已加载的用户拓展，但不再清空或删除用户包。

## 产品包来源预留

新增三种来源：

```text
bundled-default  随编辑器版本打包的默认产品配置
remote-registry  公司后台/GitHub/Gitee 的版本发现和下载来源
remote-cache     最近一次下载并校验成功、可离线继续使用的产品包
user-local       用户本地导入包
```

产品卡片通过 `resolveProductLibraryItem` 解析：

```text
存在已校验的 remote-cache
  -> 在线和离线都优先使用 cachedRemoteManifest

没有 remote-cache
  -> 使用 bundledDefaultManifest

检查版本发现更新
  -> 下载并校验成功后才替换 remote-cache
  -> 下载失败继续使用原 remote-cache

缓存损坏或用户恢复默认
  -> 最后才使用 bundledDefaultManifest
```

当前只落地来源优先级和兜底数据结构，“检查版本”仍是占位交互。后续接后台时必须把最近一次校验成功的远程包持久化，断网不能直接回退到随软件打包的旧版本。

## 变更文件与 Review 结论

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `product-extension-library.jsx` | 三个 Tab、用户包操作和来源标签 | 用户包已从模块页隔离；加载、卸载和删除语义分开 |
| `product-extension-library.css` | 用户操作按钮及窄窗口布局 | 三个 Tab 和工具栏在窄窗口允许换行，不覆盖卡片内容 |
| `library-sources.js` | 产品、远程缓存和用户来源解析 | 已校验缓存优先于内置默认，内置版本只做最后兜底 |
| `persistence.js` | 保存 manifest 和 enabled | 兼容旧 manifest-only 数据，卸载状态可持久化 |
| `custom-extensions.js` | Redux 启用状态切换 | 不需要删除包即可改变加载状态 |
| `blocks.jsx` | Python 模式自动注册用户包 | 只注册 `enabled !== false` 的用户包 |
| `product-extension-library.test.jsx` | 页面行为测试 | 验证模块页隔离和卸载不删除 |
| `library-sources.test.js` | 来源模型测试 | 验证内置兜底、远程覆盖和用户来源 |
| `persistence.test.js` | 状态持久化测试 | 验证 disabled 保存及旧数据迁移 |

## 自动化验证

新增测试覆盖：

1. 用户包不出现在模块拓展页。
2. 用户包只在用户拓展页显示。
3. 卸载调用 VM unregister，但不调用删除 action。
4. 卸载后卡片仍保留并显示“加载”。
5. `enabled=false` 可以保存和恢复。
6. 旧 manifest-only 数据按 enabled=true 恢复。
7. 已校验后台缓存可以覆盖内置 manifest，并作为离线首选版本。

已执行：

```text
4 个相关 Jest suite：通过
9 个测试：通过
npm run i18n:src：通过
webpack dev server：编译通过
Playwright 浏览器人工流：导入、卸载、保留卡片和重新加载按钮通过
git diff --check：通过
```

页面检查覆盖 1440×900 视口，控制台没有新的 page error。ESLint 因当前 `node_modules` 缺少 `unrs-resolver` 可选原生绑定而无法启动；本轮没有删除 lockfile 或重装依赖。

## 仍未实现

1. URL 导入真实下载。
2. 公司后台 catalog/package API。
3. GitHub/Gitee Release 查询与 `.sbext` 下载。
4. SHA256 校验、远程缓存持久化和“旧缓存优先、内置最后兜底”执行逻辑。
5. “检查版本”真实版本比较、更新确认和安装。
6. 项目文件记录产品包版本、来源、tag 和 checksum。
7. 用户包删除前的二次确认和完整 `.sbext` 导出。

## 下一轮建议

先实现只读远程 catalog 和版本比较，让内置 AI机甲麦轮车卡片能够显示：

```text
当前：内置默认 0.2.1
最新：后台包 0.3.0
操作：更新 / 继续使用内置版本
```

第一次下载和校验成功后保存为 `remote-cache 0.3.0`。后续检查失败或断网时继续使用 0.3.0；只有缓存不存在、损坏或用户主动恢复默认时才使用内置 0.2.1。
