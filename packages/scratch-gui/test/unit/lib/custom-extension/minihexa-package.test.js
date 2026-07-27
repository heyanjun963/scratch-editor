import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {normalizeCustomExtensionManifest} from '../../../../src/lib/custom-extension/manifest-schema';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';

const EXPECTED_OPCODES = [
    'start_thread', 'start_run_thread', 'buzzer_tone_set', 'buzzer_tone_set_arg',
    'buzzer_tone_set_volume', 'get_battery_level', 'get_volume', 'disable_lowPower_alarm',
    'print_str', 'print_number', 'set_body_reset', 'set_body_angle', 'set_body_pose',
    'set_body_pose_height', 'set_go', 'set_go_step', 'set_move_xyz', 'set_move_xyz_step',
    'set_turn', 'set_turn_step', 'set_go_stop', 'set_leg_lift', 'set_self_balance',
    'set_servo', 'action_run', 'action_stop', 'when_minihexa_key_click_thread',
    'when_minihexa_key_longclick_thread', 'key_is_pressed', 'imu_read_gyro_data',
    'imu_read_angle', 'serial_set_baudrate', 'serial_write', 'serial_has_recv_data',
    'serial_recv_contains', 'serial_recv_buff', 'get_serial_cmd', 'get_serial_args', 'clear_buffer'
];

// miniHexa 内置默认版验证 MPEXT 快照的完整积木面和方向模板安全约束。
describe('miniHexa built-in Mind+ snapshot', () => {
    test('keeps the complete legacy block surface and Python generator', () => {
        const manifest = builtinProductManifests.minihexa;
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'minihexa');

        expect(manifest).toMatchObject({
            id: 'minihexa',
            name: 'miniHexa',
            version: '0.1.1',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            'entry', '板载资源', '输出打印', '运动控制', '舵机控制',
            '动作组', '按键', 'IMU传感器', '串口通信'
        ]);
        expect(Object.keys(manifest.menus)).toHaveLength(19);
        expect(manifest.menus.rhythms.items.map(item => item.text)).toEqual([
            '二分之一', '四分之一', '八分之一', '一拍', '两拍', '长音', '0'
        ]);
        expect(manifest.blocks.every(block => (
            block.codegen.python.template ||
            block.codegen.python.entryTemplate ||
            block.codegen.python.variables.length
        ))).toBe(true);
        expect(catalogItem).toMatchObject({
            version: '0.1.1',
            latestVersion: '0.1.1',
            status: 'available'
        });
    });

    test('rejects template selectors backed by connectable inputs', () => {
        expect(() => normalizeCustomExtensionManifest({
            formatVersion: 1,
            id: 'selectorfixture',
            blocks: [{
                opcode: 'move',
                text: 'move [DIRECTION]',
                arguments: {
                    DIRECTION: {type: 'number', defaultValue: 1}
                },
                codegen: {
                    python: {
                        template: 'move(0)',
                        templateSelector: {
                            argument: 'DIRECTION',
                            cases: {1: 'move(1)'}
                        }
                    }
                }
            }]
        })).toThrow('templateSelector 参数 DIRECTION 必须是固定字段');
    });
});
