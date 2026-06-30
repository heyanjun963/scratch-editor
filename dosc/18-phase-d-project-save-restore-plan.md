# 阶段 D：项目保存和恢复方案

## 结论

项目保存和恢复优先复用 Scratch 原版 `.sb3` 能力，不新增 `.scratchpy.json` 或其它自定义项目文件格式。

原版已经提供：

- 从电脑加载项目。
- 下载项目到电脑。
- `.sb3` 项目包格式。
- VM 项目序列化和反序列化。

因此阶段 D 的方向不是重新实现保存系统，而是研究并复用原版链路。

## 原版能力入口

GUI 菜单里已有“保存到电脑 / 从电脑加载”相关功能：

- `packages/scratch-gui/src/components/menu-bar/file-menu.jsx`
- `packages/scratch-gui/src/components/menu-bar/menu-bar.jsx`
- `packages/scratch-gui/src/containers/sb3-downloader.jsx`
- `packages/scratch-gui/src/lib/sb-file-uploader-hoc.jsx`

VM 侧已有 `.sb3` 保存能力：

- `packages/scratch-vm/src/virtual-machine.js`
  - `saveProjectSb3()`
  - `toJSON()`

## 后续要研究的问题

当前公司代码模式新增了 Python 相关状态，这些状态是否能随 `.sb3` 保存，需要继续确认。

重点看：

1. Python 扩展积木是否已经作为 Scratch blocks 保存进 `.sb3`。
2. 代码模式生成的 Python 文本是否需要保存，还是可以打开后由积木重新生成。
3. 编辑器模式、Tab 信息、代码模式 UI 状态是否需要额外保存。
4. 如果要保存额外 metadata，应优先考虑挂到 `.sb3` 项目 JSON 里，而不是新建独立格式。

## 推荐实施顺序

1. 先验证原版 `.sb3` 是否能保存并恢复 Python 扩展积木。
2. 如果积木能恢复，打开后重新触发 Python codegen。
3. 如果需要保存编辑器模式，再研究 `.sb3` metadata 扩展点。
4. 最后再补最近项目、dirty 状态、关闭提醒。

## 人工验证清单

### 原版菜单加载

1. 新建代码模式项目。
2. 拖入 Python 扩展积木。
3. 使用原版“保存到电脑”导出 `.sb3`。
4. 新开或重启桌面端。
5. 使用原版“从电脑加载”打开 `.sb3`。
6. 预期：Python 积木能恢复。
7. 预期：Python 代码区能重新生成代码。
8. 预期：运行按钮仍能调用本机 Python。

### 桌面首页入口

首页“打开项目”暂时禁用。

当前推荐流程：

1. 先在首页选择舞台模式或代码模式。
2. 进入编辑器后，使用原版菜单“从电脑加载”选择 `.sb3`。
3. 这样可以复用 `SBFileUploaderHOC` 已有的状态机和 `vm.loadProject(ArrayBuffer)` 链路。

暂不在首页直接打开 `.sb3`，避免重复实现项目加载状态机。

## 暂不做

1. 不新增 `.scratchpy.json`。
2. 不新增桌面端自定义保存管理器。
3. 不把项目主格式改成 JSON。
4. 不单独保存 Python 文件作为项目主格式。
5. 暂不新增首页直接打开 `.sb3` 的 `project:*` IPC。

## 当前判断

先别急着做自定义保存。原版 `.sb3` 已经是更稳定、更兼容的项目格式。

阶段 D 的真正任务是：把公司新增的代码模式能力接入原版 `.sb3` 保存/加载链路，而不是绕开它重做一套。
