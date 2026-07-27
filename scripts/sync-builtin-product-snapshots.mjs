// 从产品仓库的已验证 MPEXT 生成编辑器离线快照，运行时不再依赖旧的拆分 JSON 产品包。
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import {serializeCustomExtensionManifest} from '../packages/scratch-gui/src/lib/custom-extension/manifest-schema.js';
import {readCustomExtensionPackageBuffer} from '../packages/scratch-gui/src/lib/custom-extension/package-reader.js';

const PRODUCT_IDS = ['aidoggy', 'aimecanum', 'minihexa'];
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotRoot = path.join(
    editorRoot,
    'packages/scratch-gui/src/lib/custom-extension/builtin-product-snapshots'
);

const getArgumentValue = flag => {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
};

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

// 所有包先在内存中完成哈希、ID、版本和解析校验，通过后才整体替换内置快照目录。
const loadVerifiedSnapshots = async productRepository => {
    const catalogPath = path.join(productRepository, 'catalog.json');
    const catalog = readJson(catalogPath);
    if (catalog.formatVersion !== 1 || !Array.isArray(catalog.packages)) {
        throw new Error(`产品 catalog 格式不受支持: ${catalogPath}`);
    }

    return Promise.all(PRODUCT_IDS.map(async packageId => {
        const entry = catalog.packages.find(item => item.packageId === packageId);
        if (!entry) throw new Error(`产品 catalog 缺少 ${packageId}`);
        if (!String(entry.asset || '').toLowerCase().endsWith('.mpext')) {
            throw new Error(`产品 ${packageId} 尚未切换为 MPEXT: ${entry.asset || '(empty)'}`);
        }
        const packagePath = path.join(productRepository, 'dist', entry.asset);
        const data = fs.readFileSync(packagePath);
        const sha256 = createHash('sha256').update(data).digest('hex');
        if (sha256 !== String(entry.sha256 || '').toLowerCase()) {
            throw new Error(`产品 ${packageId} 的 MPEXT 与 catalog SHA256 不一致`);
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
