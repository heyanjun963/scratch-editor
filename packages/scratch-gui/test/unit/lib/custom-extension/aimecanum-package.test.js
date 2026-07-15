import fs from 'fs';
import os from 'os';
import path from 'path';
import {execFileSync} from 'child_process';

import JSZip from 'jszip';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {readCustomExtensionPackageBuffer} from '../../../../src/lib/custom-extension/package-reader';

// 验证 AI 麦轮车的标准源包可以稳定打包、重新导入，并与编辑器内置配置保持一致。
describe('AI mecanum custom extension package', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const sourceDirectory = path.join(
        guiRoot,
        'src/lib/custom-extension/builtin-product-packages/aimecanum'
    );
    const packScript = path.join(guiRoot, 'scripts/pack-custom-extension.mjs');
    let temporaryDirectory;

    afterEach(() => {
        if (temporaryDirectory) {
            fs.rmSync(temporaryDirectory, {recursive: true, force: true});
            temporaryDirectory = null;
        }
    });

    test('packs the required standard package files', async () => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-aimecanum-'));
        const outputFile = path.join(temporaryDirectory, 'aimecanum.sbext');
        const secondOutputFile = path.join(temporaryDirectory, 'aimecanum-second.sbext');

        execFileSync(process.execPath, [packScript, sourceDirectory, outputFile]);
        execFileSync(process.execPath, [packScript, sourceDirectory, secondOutputFile]);

        const zip = await JSZip.loadAsync(fs.readFileSync(outputFile));
        expect(Object.keys(zip.files).filter(fileName => !zip.files[fileName].dir).sort()).toEqual([
            'blocks.json',
            'docs/README.md',
            'generator/python.json',
            'manifest.json'
        ]);
        expect(fs.readFileSync(secondOutputFile)).toEqual(fs.readFileSync(outputFile));
    });

    test('re-imports to the same manifest used by the built-in product', async () => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-aimecanum-'));
        const outputFile = path.join(temporaryDirectory, 'aimecanum.sbext');

        execFileSync(process.execPath, [packScript, sourceDirectory, outputFile]);
        const importedManifest = await readCustomExtensionPackageBuffer(
            fs.readFileSync(outputFile),
            'aimecanum.sbext'
        );

        expect(importedManifest).toEqual(builtinProductManifests.aimecanum);
        expect(importedManifest.blocks).toHaveLength(58);
        expect(importedManifest.blocks.find(block => block.opcode === 'set_motor_speed_all').codegen.python)
            .toMatchObject({
                template: 'mecanumCar.set_motors_speed({SPEED4},{SPEED3},{SPEED2},{SPEED1})',
                imports: ['import Hiwonder_DEV'],
                variables: ['mecanumCar = Hiwonder_DEV.DEV_MecanumCar()']
            });
    });
});
