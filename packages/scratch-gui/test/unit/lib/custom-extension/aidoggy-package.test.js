import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionInfo} from '../../../../src/lib/custom-extension/manifest-to-extension';
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

// AiDoggy 内置默认版直接验证由 MPEXT 生成的离线 manifest，不再重新打包旧 JSON。
describe('AiDoggy built-in Mind+ snapshot', () => {
    test('keeps the complete enabled block surface and legacy menu values', () => {
        const manifest = builtinProductManifests.aidoggy;
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'aidoggy');

        expect(manifest).toMatchObject({
            id: 'aidoggy',
            name: 'AiDoggy',
            version: '0.1.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            'entry', '板载资源', '输出打印', '运动控制', '动作组控制'
        ]);
        expect(manifest.categories[0].hideLabel).toBe(true);
        expect(Object.keys(manifest.menus)).toHaveLength(8);
        expect(manifest.menus.orientation.items.map(item => item.value)).toEqual([
            '0', '180', '90', '-90', '45', '-45', '75', '-75'
        ]);
        expect(manifest.menus.oriention_turn.items.map(item => item.value)).toEqual(['1', '-1']);
        expect(manifest.menus.blocking.items.map(item => item.value)).toEqual(['True', 'False']);
        expect(manifest.blocks.every(block => (
            block.codegen.python.template || block.codegen.python.variables.length
        ))).toBe(true);
        expect(catalogItem).toMatchObject({
            version: '0.1.0',
            latestVersion: '0.1.0',
            status: 'available'
        });

        const extensionInfo = manifestToExtensionInfo(manifest);
        expect(extensionInfo.menuIconURI).toBe(manifest.icon);
        expect(extensionInfo.blockIconURI).toBeUndefined();
    });
});
