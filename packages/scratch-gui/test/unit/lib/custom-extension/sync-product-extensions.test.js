import {execFileSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// 验证产品仓库可同时发布临时旧 SBEXT 和 Mind+ MPEXT，且不会反向覆盖产品源码。
describe('product extension repository sync', () => {
    const editorRoot = path.resolve(__dirname, '../../../../../..');
    const syncScript = path.join(editorRoot, 'scripts/sync-product-extensions.mjs');
    const mindPlusSource = path.join(
        editorRoot,
        'packages/scratch-gui/test/fixtures/custom-extension/mindplus/aidoggy-python-fixture'
    );
    let targetDirectory;

    beforeEach(() => {
        targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-product-extensions-'));
        fs.mkdirSync(path.join(targetDirectory, 'products'), {recursive: true});
        const legacyDirectory = path.join(targetDirectory, 'products/legacyproduct');
        fs.mkdirSync(path.join(legacyDirectory, 'generator'), {recursive: true});
        fs.writeFileSync(path.join(legacyDirectory, 'manifest.json'), JSON.stringify({
            formatVersion: 2,
            id: 'legacyproduct',
            name: 'Legacy product',
            version: '1.0.0',
            entry: {blocks: 'blocks.json', python: 'generator/python.json'}
        }));
        fs.writeFileSync(path.join(legacyDirectory, 'blocks.json'), JSON.stringify({
            blocks: [{opcode: 'run', blockType: 'command', text: 'run', arguments: {}}]
        }));
        fs.writeFileSync(path.join(legacyDirectory, 'generator/python.json'), JSON.stringify({
            blocks: {run: {template: 'run()'}}
        }));
        fs.cpSync(mindPlusSource, path.join(targetDirectory, 'products/aidoggy'), {recursive: true});
        fs.writeFileSync(path.join(targetDirectory, 'product-extension-registry.json'), JSON.stringify({
            formatVersion: 1,
            repositoryType: 'scratch-product-extension-registry',
            provider: 'github',
            repository: 'company/scratch-product-extensions',
            packageDownloadBaseUrl: 'https://raw.githubusercontent.com/company/scratch-product-extensions/main/dist',
            releaseDownloadBaseUrl: 'https://github.com/company/scratch-product-extensions/releases/download'
        }));
        fs.writeFileSync(path.join(targetDirectory, 'catalog.json'), JSON.stringify({
            formatVersion: 1,
            packages: [{
                packageId: 'remote-only-product',
                name: 'Remote only product',
                version: '1.0.0',
                status: 'published'
            }]
        }));
    });

    afterEach(() => {
        fs.rmSync(targetDirectory, {recursive: true, force: true});
    });

    test('packs repository sources without removing remote products', () => {
        execFileSync(process.execPath, [syncScript, '--target', targetDirectory]);
        const firstCatalog = fs.readFileSync(path.join(targetDirectory, 'catalog.json'), 'utf8');
        const catalog = JSON.parse(firstCatalog);
        const legacyEntry = catalog.packages.find(entry => entry.packageId === 'legacyproduct');
        const mindPlusEntry = catalog.packages.find(entry => entry.packageId === 'aidoggy');
        const legacyAsset = fs.readFileSync(path.join(targetDirectory, 'dist', legacyEntry.asset));
        const mindPlusAsset = fs.readFileSync(path.join(targetDirectory, 'dist', mindPlusEntry.asset));

        expect(fs.existsSync(path.join(targetDirectory, 'products/legacyproduct/blocks.json'))).toBe(true);
        expect(fs.existsSync(path.join(targetDirectory, 'products/aidoggy/python/main.ts'))).toBe(true);
        expect(catalog.packages.find(entry => entry.packageId === 'remote-only-product')).toBeTruthy();
        expect(legacyEntry).toMatchObject({
            asset: expect.stringMatching(/\.sbext$/),
            sha256: createHash('sha256').update(legacyAsset).digest('hex'),
            status: 'draft'
        });
        expect(mindPlusEntry).toMatchObject({
            asset: 'aidoggy-0.1.0.mpext',
            tag: 'aidoggy-v0.1.0',
            sha256: createHash('sha256').update(mindPlusAsset).digest('hex'),
            status: 'draft'
        });

        execFileSync(process.execPath, [syncScript, '--target', targetDirectory]);
        expect(fs.readFileSync(path.join(targetDirectory, 'catalog.json'), 'utf8')).toBe(firstCatalog);
        expect(fs.readFileSync(path.join(targetDirectory, 'dist', mindPlusEntry.asset))).toEqual(mindPlusAsset);
    });

    test('refuses to replace a newer catalog version with an older source', () => {
        fs.writeFileSync(path.join(targetDirectory, 'catalog.json'), JSON.stringify({
            formatVersion: 1,
            packages: [{
                packageId: 'aidoggy',
                name: 'AiDoggy',
                version: '9.0.0',
                status: 'published'
            }]
        }));

        expect(() => execFileSync(process.execPath, [syncScript, '--target', targetDirectory]))
            .toThrow(/源版本低于 catalog/);
    });

    test('returns a same-version package to draft when its artifact changes', () => {
        fs.writeFileSync(path.join(targetDirectory, 'catalog.json'), JSON.stringify({
            formatVersion: 1,
            packages: [{
                packageId: 'aidoggy',
                name: 'AiDoggy',
                version: '0.1.0',
                asset: 'aidoggy-0.1.0.sbext',
                sha256: '0'.repeat(64),
                status: 'published'
            }]
        }));

        execFileSync(process.execPath, [syncScript, '--target', targetDirectory]);
        const catalog = JSON.parse(fs.readFileSync(path.join(targetDirectory, 'catalog.json'), 'utf8'));

        expect(catalog.packages.find(entry => entry.packageId === 'aidoggy')).toMatchObject({
            asset: 'aidoggy-0.1.0.mpext',
            status: 'draft'
        });
    });
});
