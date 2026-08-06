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
                packageId: 'aihexa',
                version: '1.0.0',
                asset: 'aihexa-1.0.0.mpext',
                sha256: 'c90b9c09ab64ce88cefd89a93b276acc7abf8311c9f99cfbfdf88eecfa337fe0'
            },
            {
                packageId: 'aimecanum',
                version: '0.2.3',
                asset: 'aimecanum-0.2.3.mpext',
                sha256: 'c5cbbdc546cc6cc215bbc774b66a98606ae7a6b1a91ed356333046788cc937be'
            },
            {
                packageId: 'aiquadruped',
                version: '1.0.0',
                asset: 'aiquadruped-1.0.0.mpext',
                sha256: 'a1504b49876cc78c4bc454bb93c0f23ec05999eb48e34c6ec833f21e8a03f456'
            },
            {
                packageId: 'aiquadrupedpro',
                version: '1.0.0',
                asset: 'aiquadrupedpro-1.0.0.mpext',
                sha256: '7f93e619466d5e4a895942825c60b269042c399c28490f348f2df5ce2cd1a458'
            },
            {
                packageId: 'minihexa',
                version: '0.1.1',
                asset: 'minihexa-0.1.1.mpext',
                sha256: '7bbf1554e7dd67b7aa00d9e92b408f0ca7e2fb5cd2911c9597f71ca87d882478'
            },
            {
                packageId: 'sensor',
                version: '1.5.0',
                asset: 'sensor-1.5.0.mpext',
                sha256: '3a4f4279fec5d7245bd5c379323942602a0bd0ba8663101864e82abe8877a6ae'
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

    test('bundles the complete AI hexapod product manifest', () => {
        const manifest = builtinProductManifests.aihexa;

        expect(manifest.blocks).toHaveLength(42);
        expect(manifest.categories).toHaveLength(8);
        expect(Object.keys(manifest.menus)).toHaveLength(10);
        expect(manifest.blocks.filter(block => block.blockType === 'hat')).toHaveLength(4);
    });

    test('bundles the complete AI quadruped pro product manifest', () => {
        const manifest = builtinProductManifests.aiquadrupedpro;

        expect(manifest.blocks).toHaveLength(44);
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
