import {execFileSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import JSZip from 'jszip';

const FIXTURES = [
    {
        name: 'aidoggy-python-fixture',
        asset: 'python',
        expectedFiles: [
            'config.json',
            'python/_images/icon.svg',
            'python/_locales/zh-cn.json',
            'python/_menus/index.json',
            'python/main.ts'
        ]
    },
    {
        name: 'python-basic-fixture',
        asset: 'python',
        expectedFiles: [
            'config.json',
            'python/_images/icon.svg',
            'python/_locales/zh-cn.json',
            'python/_menus/index.json',
            'python/libraries/fixture_helper.py',
            'python/main.ts'
        ]
    }
];

// Fixture 测试锁定 Mind+ 外部格式，解析器行为由 package reader 单测独立覆盖。
describe('Mind+ compatibility fixtures', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const fixtureRoot = path.join(guiRoot, 'test/fixtures/custom-extension/mindplus');
    const packScript = path.join(guiRoot, 'scripts/pack-mindplus-fixtures.mjs');
    let outputDirectory;

    beforeAll(() => {
        outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-mindplus-fixtures-'));
        execFileSync(process.execPath, [packScript, '--output', outputDirectory]);
    });

    afterAll(() => {
        fs.rmSync(outputDirectory, {recursive: true, force: true});
    });

    test.each(FIXTURES)('keeps $name source and MPEXT package in sync', async fixture => {
        const sourceDirectory = path.join(fixtureRoot, fixture.name);
        const config = JSON.parse(fs.readFileSync(path.join(sourceDirectory, 'config.json'), 'utf8'));
        const packageName = `${fixture.name}-${config.version}.mpext`;
        const committedPackage = fs.readFileSync(path.join(fixtureRoot, 'dist', packageName));
        const generatedPackage = fs.readFileSync(path.join(outputDirectory, packageName));
        const zip = await JSZip.loadAsync(committedPackage);
        const archiveFiles = Object.keys(zip.files).filter(name => !zip.files[name].dir).sort();

        expect(committedPackage.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
        expect(generatedPackage).toEqual(committedPackage);
        expect(archiveFiles).toEqual(fixture.expectedFiles);
        expect(config).toMatchObject({
            id: expect.any(String),
            version: '0.1.0',
            asset: {
                [fixture.asset]: {
                    dir: `${fixture.asset}/`,
                    main: 'main.ts'
                }
            }
        });
    });

    test('keeps the AiDoggy Mind+ fixture aligned with the current product package', () => {
        const fixturePackage = fs.readFileSync(path.join(
            fixtureRoot,
            'dist/aidoggy-python-fixture-0.1.0.mpext'
        ));
        const snapshotPackage = fs.readFileSync(path.join(
            guiRoot,
            'src/lib/custom-extension/builtin-product-snapshots/packages/aidoggy-0.1.0.mpext'
        ));

        expect(fixturePackage).toEqual(snapshotPackage);
    });

    test('covers Python dependencies, local libraries and basic generator input', () => {
        const sourceDirectory = path.join(fixtureRoot, 'python-basic-fixture');
        const config = JSON.parse(fs.readFileSync(path.join(sourceDirectory, 'config.json'), 'utf8'));
        const main = fs.readFileSync(path.join(sourceDirectory, 'python/main.ts'), 'utf8');
        const menu = JSON.parse(fs.readFileSync(path.join(sourceDirectory, 'python/_menus/index.json'), 'utf8'));

        expect(config.asset.python.dependencies).toEqual({'typing-extensions': '4.12.2'});
        expect(main).toContain('Generator.addImport("import time")');
        expect(main).toContain('Generator.addCode');
        expect(menu.MODE.default_readStatus_MODE).toBe('fast');
        expect(fs.existsSync(path.join(sourceDirectory, 'python/libraries/fixture_helper.py'))).toBe(true);
    });
});
