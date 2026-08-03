// 从产品仓库的已验证 MPEXT 生成编辑器离线快照，运行时不再依赖旧的拆分 JSON 产品包。
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import * as manifestSchemaModule from '../packages/scratch-gui/src/lib/custom-extension/manifest-schema.js';
import * as packageReaderModule from '../packages/scratch-gui/src/lib/custom-extension/package-reader.js';

// tsx 在不同 Node 版本下可能把 GUI 的 .js 判定为 ESM 或 CommonJS，统一兼容两种导出形态。
const manifestSchema = manifestSchemaModule.default || manifestSchemaModule;
const packageReader = packageReaderModule.default || packageReaderModule;
const {serializeCustomExtensionManifest} = manifestSchema;
const {readCustomExtensionPackageBuffer} = packageReader;

const PRODUCT_SNAPSHOTS = [
    {
        packageId: 'aidoggy',
        version: '0.1.0',
        asset: 'aidoggy-0.1.0.mpext',
        sha256: '987b83dc86aabe9262c1f9d9311537741d29be52c4cd259d1af2558627cfc754'
    },
    {
        packageId: 'aimecanum',
        version: '0.2.3',
        asset: 'aimecanum-0.2.3.mpext',
        sha256: '30c5da5f7698f0a8c5b988aa462087ac82be06cd65027231294a9940ff651b95'
    },
    {
        packageId: 'aiquadruped',
        version: '1.0.0',
        asset: 'aiquadruped-1.0.0.mpext',
        sha256: '883abd0f9c51a74f1b7ce9c2b3bd1addb6b7cbc94c2475df3e0f32b71ea71c04'
    },
    {
        packageId: 'aiquadrupedpro',
        version: '1.0.0',
        asset: 'aiquadrupedpro-1.0.0.mpext',
        sha256: '910381e77f5d75bea69ab97550d0b411702fdafebe213019fce46ad4e1c1fecd'
    },
    {
        packageId: 'minihexa',
        version: '0.1.1',
        asset: 'minihexa-0.1.1.mpext',
        sha256: '7bbf1554e7dd67b7aa00d9e92b408f0ca7e2fb5cd2911c9597f71ca87d882478'
    }
];
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotRoot = path.join(
    editorRoot,
    'packages/scratch-gui/src/lib/custom-extension/builtin-product-snapshots'
);

const getArgumentValue = flag => {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
};

const writeJson = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

// 所有包先在内存中完成哈希、ID、版本和解析校验，通过后才整体替换内置快照目录。
const loadVerifiedSnapshots = async productRepository => {
    return Promise.all(PRODUCT_SNAPSHOTS.map(async entry => {
        const {packageId} = entry;
        const packagePath = path.join(productRepository, 'dist', entry.asset);
        const data = fs.readFileSync(packagePath);
        const sha256 = createHash('sha256').update(data).digest('hex');
        if (sha256 !== entry.sha256) {
            throw new Error(`产品 ${packageId} 的 MPEXT 与内置版本锁定 SHA256 不一致`);
        }
        const manifest = await readCustomExtensionPackageBuffer(data, entry.asset);
        if (manifest.id !== packageId || manifest.version !== entry.version) {
            throw new Error(`产品 ${packageId} 的包内 ID 或版本与 catalog 不一致`);
        }
        return {
            indexEntry: {
                packageId,
                version: entry.version,
                asset: entry.asset,
                sha256
            },
            data,
            manifest: serializeCustomExtensionManifest(manifest)
        };
    }));
};

const writeSnapshots = snapshots => {
    const expectedRoot = path.join(editorRoot, 'packages/scratch-gui/src/lib/custom-extension');
    if (!snapshotRoot.startsWith(`${expectedRoot}${path.sep}`)) {
        throw new Error(`内置快照目录不在 custom-extension 内: ${snapshotRoot}`);
    }
    fs.rmSync(snapshotRoot, {recursive: true, force: true});
    snapshots.forEach(snapshot => {
        const {packageId, asset} = snapshot.indexEntry;
        const packagePath = path.join(snapshotRoot, 'packages', asset);
        fs.mkdirSync(path.dirname(packagePath), {recursive: true});
        fs.writeFileSync(packagePath, snapshot.data);
        writeJson(path.join(snapshotRoot, 'manifests', `${packageId}.json`), snapshot.manifest);
    });
    writeJson(path.join(snapshotRoot, 'index.json'), {
        formatVersion: 1,
        packages: snapshots.map(snapshot => snapshot.indexEntry)
    });
    fs.writeFileSync(path.join(snapshotRoot, 'README.md'), [
        '# 内置产品 Mind+ 快照',
        '',
        '本目录由 `npm run sync:builtin-product-snapshots` 从独立产品仓库的已验证 `.mpext` 生成。',
        '不要手工修改 manifest 或压缩包；产品源码只在 `scratch-product-extensions/products` 维护。',
        ''
    ].join('\n'));
};

const syncBuiltinProductSnapshots = async productRepository => {
    const absoluteRepository = path.resolve(productRepository);
    const snapshots = await loadVerifiedSnapshots(absoluteRepository);
    writeSnapshots(snapshots);
    console.info(`已生成 ${snapshots.length} 个内置 Mind+ 产品快照: ${snapshotRoot}`);
};

const productRepository = getArgumentValue('--source') || path.resolve(editorRoot, '..', 'scratch-product-extensions');
syncBuiltinProductSnapshots(productRepository).catch(error => {
    console.error(error);
    process.exitCode = 1;
});

export {syncBuiltinProductSnapshots};
