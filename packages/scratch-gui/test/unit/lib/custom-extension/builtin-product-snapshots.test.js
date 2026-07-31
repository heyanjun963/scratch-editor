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

        expect(index.packages).toEqual([
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
                packageId: 'minihexa',
                version: '0.1.1',
                asset: 'minihexa-0.1.1.mpext',
                sha256: '7bbf1554e7dd67b7aa00d9e92b408f0ca7e2fb5cd2911c9597f71ca87d882478'
            }
        ]);
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

    test('bundles the complete AI quadruped product manifest', () => {
        const manifest = builtinProductManifests.aiquadruped;

        expect(manifest.blocks).toHaveLength(38);
        expect(manifest.categories).toHaveLength(8);
        expect(Object.keys(manifest.menus)).toHaveLength(10);
        expect(manifest.blocks.filter(block => block.blockType === 'hat')).toHaveLength(4);
    });

    test('does not keep the obsolete split JSON product packages', () => {
        expect(fs.existsSync(path.join(
            guiRoot,
            'src/lib/custom-extension/builtin-product-packages'
        ))).toBe(false);
    });
});
