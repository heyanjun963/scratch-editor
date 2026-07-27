import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {normalizeCustomExtensionManifest} from '../../../../src/lib/custom-extension/manifest-schema';
import {readCustomExtensionPackageBuffer} from '../../../../src/lib/custom-extension/package-reader';

// 内置快照必须由已校验的 MPEXT 生成，运行时 manifest、离线包和哈希三者保持一致。
describe('built-in Mind+ product snapshots', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const snapshotRoot = path.join(guiRoot, 'src/lib/custom-extension/builtin-product-snapshots');

    test('loads every bundled manifest from its verified MPEXT snapshot', async () => {
        const index = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'index.json'), 'utf8'));

        expect(index.packages.map(item => item.packageId)).toEqual(['aidoggy', 'aimecanum', 'minihexa']);
        for (const item of index.packages) {
            const packagePath = path.join(snapshotRoot, 'packages', item.asset);
            const manifestPath = path.join(snapshotRoot, 'manifests', `${item.packageId}.json`);
            const packageData = fs.readFileSync(packagePath);
            const parsedManifest = await readCustomExtensionPackageBuffer(packageData, item.asset);
            const storedManifest = normalizeCustomExtensionManifest(JSON.parse(
                fs.readFileSync(manifestPath, 'utf8')
            ));

            expect(createHash('sha256').update(packageData).digest('hex')).toBe(item.sha256);
            expect(storedManifest).toEqual(parsedManifest);
            expect(builtinProductManifests[item.packageId]).toEqual(parsedManifest);
        }
    });

    test('does not keep the obsolete split JSON product packages', () => {
        expect(fs.existsSync(path.join(
            guiRoot,
            'src/lib/custom-extension/builtin-product-packages'
        ))).toBe(false);
    });
});
