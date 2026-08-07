# 内置产品 Mind+ 快照

本目录由 `npm run sync:builtin-product-snapshots` 从独立产品仓库的已验证 `.mpext` 生成。
标记为 editor 内置来源的迁移批次会先复用当前已验证包，待独立产品仓库补齐作者源后再切换。
不要手工修改 manifest 或压缩包；应从已验证 MPEXT 重新生成快照。
