import {execFileSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// 验证同步命令会复制标准源包、生成稳定发布包，并保留总仓库中的其他产品。
describe('product extension repository sync', () => {
    const editorRoot = path.resolve(__dirname, '../../../../../..');
    const syncScript = path.join(editorRoot, 'scripts/sync-product-extensions.mjs');
    const productManifest = JSON.parse(fs.readFileSync(path.join(
        editorRoot,
        'packages/scratch-gui/src/lib/custom-extension/builtin-product-packages/aimecanum/manifest.json'
    ), 'utf8'));
    let targetDirectory;

    beforeEach(() => {
        targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-product-extensions-'));
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

    test('syncs built-in sources and release assets without removing remote products', () => {
        execFileSync(process.execPath, [syncScript, '--target', targetDirectory]);
        const firstCatalog = fs.readFileSync(path.join(targetDirectory, 'catalog.json'), 'utf8');
        const assetName = `${productManifest.id}-${productManifest.version}.sbext`;
        const assetPath = path.join(targetDirectory, 'dist', assetName);
        const firstAsset = fs.readFileSync(assetPath);
        const catalog = JSON.parse(firstCatalog);

        expect(fs.existsSync(path.join(targetDirectory, 'products', productManifest.id, 'blocks.json'))).toBe(true);
        expect(catalog.packages.find(entry => entry.packageId === 'remote-only-product')).toBeTruthy();
        expect(catalog.packages.find(entry => entry.packageId === productManifest.id)).toMatchObject({
            version: productManifest.version,
            tag: `${productManifest.id}-v${productManifest.version}`,
            asset: assetName,
            downloadUrl: `https://raw.githubusercontent.com/company/scratch-product-extensions/main/dist/${assetName}`,
            releaseDownloadUrl: `https://github.com/company/scratch-product-extensions/releases/download/` +
                `${productManifest.id}-v${productManifest.version}/${assetName}`,
            sha256: createHash('sha256').update(firstAsset).digest('hex'),
            status: 'draft'
        });

        execFileSync(process.execPath, [syncScript, '--target', targetDirectory]);
        expect(fs.readFileSync(path.join(targetDirectory, 'catalog.json'), 'utf8')).toBe(firstCatalog);
        expect(fs.readFileSync(assetPath)).toEqual(firstAsset);
    });
});
