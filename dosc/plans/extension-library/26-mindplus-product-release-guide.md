# Mind+ 产品远程发布指南

## 发布目标

把产品仓库中的 Mind+ Python 源码发布到 GitHub 和 Gitee，并让旧软件通过“检查版本”下载、校验和离线缓存新版本。

> 推荐先发布一个产品完成闭环，再依次开放另外两个。不要同时修改软件内置快照，否则本地版本与远程版本相同，页面不会显示更新。

## 当前版本

发版前同时核对软件内置版本和远程 catalog 当前版本：

| 产品 | 内置版本 | 远程当前版本 | 状态 |
| - | - | - | - |
| AiDoggy | `0.1.0` | `0.1.2` | `published` |
| AI 机甲双驱车 | 无（占位） | `1.0.0` | `published` |
| AI 机甲麦轮车 | `0.2.3` | `0.2.3` | `published` |
| AI 机甲四足机器人 | `1.0.0` | `1.0.0` | `draft`（仅本地内置测试） |
| AI 机甲四足竞赛版 | `1.0.0` | `1.0.0` | `draft`（仅本地内置测试） |
| miniHexa | `0.1.1` | `0.1.1` | `published` |

每个产品的新 `version` 必须高于该产品在远程 catalog 中的版本。一次发布批次使用一个统一 `releaseTag`，它只标识 Release，不参与产品版本比较。禁止覆盖已有标签或 Release；同版本发布文件必须保持不可变。

产品仓库的 `product-extension-registry.json` 必须配置本批统一标签：

```json
{
  "releaseTag": "python-blocks-v1.0.0"
}
```

`python-blocks-v1.0.0` 代表一批产品包。下一批使用新的批次标签，例如 `python-blocks-v1.1.0`，不要修改历史 Release。

## 1. 升级产品版本

在 `D:\code\scratch-product-extensions\products\<产品ID>\config.json` 中同时修改：

```json
{
  "version": "新版本",
  "asset": {
    "python": {
      "version": "新版本"
    }
  }
}
```

根版本和 `asset.python.version` 必须一致。只发布一个产品时，只升级该产品。

## 2. 生成发布包

```powershell
cd D:\code\scratch-editor
npm run sync:product-extensions
```

检查 `D:\code\scratch-product-extensions\catalog.json`：

- `asset` 必须是对应版本的 `.mpext`。
- `sha256` 必须与 `dist` 文件一致。
- 所有本轮产品条目的 `tag` 必须相同，并等于 `product-extension-registry.json` 的 `releaseTag`。
- `version` 仍然来自各产品自己的 `config.json`，不能为了统一 Release 而改成相同版本。
- `status` 此时必须保持 `draft`。

远程更新测试阶段不要运行 `npm run sync:builtin-product-snapshots`。内置版本必须低于远程版本。

## 3. 提交并推送产品仓库

```powershell
cd D:\code\scratch-product-extensions
git status
git add README.md catalog.json products dist
git commit -m "feat: 发布 Mind+ 产品积木包"
git push origin main
git push gitee main
```

确认 GitHub 与 Gitee 的 `main` 指向同一个提交。

## 4. 创建标签

为本轮所有产品包创建一个统一标签：

```powershell
$tag = "python-blocks-v1.0.0"
git tag --list $tag
git tag $tag
git push origin $tag
git push gitee $tag
```

创建标签前先执行 `git tag --list`，确认标签不存在。标签创建错误时不要覆盖远程标签，应提升版本后重新发布。

## 5. 创建 GitHub 和 Gitee Release

在 GitHub 和 Gitee 使用同一个 `$tag` 分别创建 Release，并一次上传本轮所有已迁移产品的 `.mpext` 文件，例如 `dist/aihexa-1.0.0.mpext` 和 `dist/aiquadrupedpro-1.0.0.mpext`。每个 catalog 条目的 `releaseDownloadUrl` 都指向这个统一 Release 下对应的 asset。

GitHub 自动生成的 **Source code** 不是积木包。Release 标题建议使用“Mind+ 产品积木包 + 批次标签”，说明中列出本批包含的产品、积木变化、Python 变化和兼容性。

## 6. 开放 catalog

确认两个平台的 Release 和 `dist` 文件均可下载后，把已发布产品的 `status` 从 `draft` 改为 `published`：

```powershell
cd D:\code\scratch-product-extensions
git add catalog.json
git commit -m "chore: 开放 Mind+ 产品远程版本"
git push origin main
git push gitee main
```

必须最后开放 catalog。客户端只读取 `published`，这样不会在附件尚未上传时看到无效更新。

## 7. 软件验收

1. 启动包含旧内置快照的软件。
2. 打开拓展库并点击“检查版本”。
3. 确认提示的当前版本和远程版本正确。
4. 安装更新，检查积木分类、菜单和 Python 生成。
5. 关闭网络并重启软件。
6. 确认仍使用刚安装的缓存版本，没有回退到内置版本。
7. 恢复网络，确认 Gitee 失败时可以回退 GitHub。

## 发布失败处理

- Release 未完成：保持或恢复 `draft`。
- SHA256 不一致：删除错误附件，提升版本并重新生成；不要覆盖已开放版本。
- 包内行为错误：发布更高补丁版本，不能修改同版本文件。
- catalog 已开放但文件不可用：先改回 `draft` 并推送；已经缓存到用户本机的版本不会被远程删除。
