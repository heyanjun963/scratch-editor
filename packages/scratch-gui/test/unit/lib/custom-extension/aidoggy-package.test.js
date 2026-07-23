import {execFileSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {readCustomExtensionPackageBuffer} from '../../../../src/lib/custom-extension/package-reader';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';

const EXPECTED_OPCODES = [
    'start_thread',
    'start_run_thread',
    'buzzer_tone_set',
    'buzzer_tone_set_arg',
    'get_battery_level',
    'set_low_battery_alarm',
    'print_str',
    'print_number',
    'set_pose',
    'set_move',
    'set_move_xyz',
    'set_turn',
    'set_gait',
    'set_stop',
    'run_action',
    'run_action_name',
    'stop_action'
];

// AiDoggy 标准包只迁移旧 VM 中实际启用的积木，并锁定旧菜单 value。
describe('AiDoggy custom extension package', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const sourceDirectory = path.join(
        guiRoot,
        'src/lib/custom-extension/builtin-product-packages/aidoggy'
    );
    const packScript = path.join(guiRoot, 'scripts/pack-custom-extension.mjs');
    let temporaryDirectory;

    afterEach(() => {
        if (temporaryDirectory) {
            fs.rmSync(temporaryDirectory, {recursive: true, force: true});
            temporaryDirectory = null;
        }
    });

    test('packs the complete enabled legacy surface and Python generator', async () => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-aidoggy-'));
        const outputFile = path.join(temporaryDirectory, 'aidoggy.sbext');

        execFileSync(process.execPath, [packScript, sourceDirectory, outputFile]);
        const manifest = await readCustomExtensionPackageBuffer(fs.readFileSync(outputFile), 'aidoggy.sbext');
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'aidoggy');

        expect(manifest).toMatchObject({
            id: 'aidoggy',
            name: 'AiDoggy',
            version: '0.1.0'
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            'entry',
            '板载资源',
            '输出打印',
            '运动控制',
            '动作组控制'
        ]);
        expect(manifest.categories[0].hideLabel).toBe(true);
        expect(Object.keys(manifest.menus)).toHaveLength(8);
        expect(Object.fromEntries(manifest.blocks.map(block => [block.opcode, block.text]))).toMatchObject({
            get_battery_level: '电池电压(mV)',
            print_str: '输出打印字符 [STR]',
            print_number: '输出打印数字 [NUM]',
            set_stop: '停止运动',
            stop_action: '停止运行动作组'
        });
        expect(manifest.menus.orientation.items.map(item => item.value)).toEqual([
            '0', '180', '90', '-90', '45', '-45', '75', '-75'
        ]);
        expect(manifest.menus.oriention_turn.items.map(item => item.value)).toEqual(['1', '-1']);
        expect(manifest.menus.blocking.items.map(item => item.value)).toEqual(['True', 'False']);
        expect(manifest.menus.rhythms.items.map(item => item.text)).toEqual([
            '二分之一', '四分之一', '八分之一', '一拍', '两拍', '长音', '连续'
        ]);
        expect(manifest.blocks.every(block => (
            block.codegen.python.template || block.codegen.python.variables.length
        ))).toBe(true);
        expect(builtinProductManifests.aidoggy).toEqual(manifest);
        expect(catalogItem).toMatchObject({
            version: '0.1.0',
            latestVersion: '0.1.0',
            status: 'available'
        });
    });
});
