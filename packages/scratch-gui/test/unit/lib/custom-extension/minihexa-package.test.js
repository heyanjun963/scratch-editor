import {execFileSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {normalizeCustomExtensionManifest} from '../../../../src/lib/custom-extension/manifest-schema';
import {readCustomExtensionPackageBuffer} from '../../../../src/lib/custom-extension/package-reader';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';

const EXPECTED_OPCODES = [
    'start_thread',
    'start_run_thread',
    'buzzer_tone_set',
    'buzzer_tone_set_arg',
    'buzzer_tone_set_volume',
    'get_battery_level',
    'get_volume',
    'disable_lowPower_alarm',
    'print_str',
    'print_number',
    'set_body_reset',
    'set_body_angle',
    'set_body_pose',
    'set_body_pose_height',
    'set_go',
    'set_go_step',
    'set_move_xyz',
    'set_move_xyz_step',
    'set_turn',
    'set_turn_step',
    'set_go_stop',
    'set_leg_lift',
    'set_self_balance',
    'set_servo',
    'action_run',
    'action_stop',
    'when_minihexa_key_click_thread',
    'when_minihexa_key_longclick_thread',
    'key_is_pressed',
    'imu_read_gyro_data',
    'imu_read_angle',
    'serial_set_baudrate',
    'serial_write',
    'serial_has_recv_data',
    'serial_recv_contains',
    'serial_recv_buff',
    'get_serial_cmd',
    'get_serial_args',
    'clear_buffer'
];

// miniHexa 标准包必须同时包含旧 VM 积木外观和旧生成器中的 Python 规则。
describe('miniHexa custom extension package', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const sourceDirectory = path.join(
        guiRoot,
        'src/lib/custom-extension/builtin-product-packages/minihexa'
    );
    const packScript = path.join(guiRoot, 'scripts/pack-custom-extension.mjs');
    let temporaryDirectory;

    afterEach(() => {
        if (temporaryDirectory) {
            fs.rmSync(temporaryDirectory, {recursive: true, force: true});
            temporaryDirectory = null;
        }
    });

    test('packs the complete legacy block surface and Python generator', async () => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-minihexa-'));
        const outputFile = path.join(temporaryDirectory, 'minihexa.sbext');

        execFileSync(process.execPath, [packScript, sourceDirectory, outputFile]);
        const manifest = await readCustomExtensionPackageBuffer(fs.readFileSync(outputFile), 'minihexa.sbext');
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'minihexa');

        expect(manifest).toMatchObject({
            id: 'minihexa',
            name: 'miniHexa',
            version: '0.1.1'
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            'entry',
            '板载资源',
            '输出打印',
            '运动控制',
            '舵机控制',
            '动作组',
            '按键',
            'IMU传感器',
            '串口通信'
        ]);
        expect(manifest.categories[0].hideLabel).toBe(true);
        expect(Object.keys(manifest.menus)).toHaveLength(19);
        expect(Object.fromEntries(manifest.blocks.map(block => [block.opcode, block.text]))).toMatchObject({
            buzzer_tone_set: '播放音调为 [TONES] 节拍为 [RHYTHMS] 模式为 [MODE]',
            buzzer_tone_set_arg: '播放音调为 [TONES] 节拍为 [RHYTHMS] 模式为 [MODE]',
            buzzer_tone_set_volume: '设置蜂鸣器音量为 [VALUE]',
            get_battery_level: '电量值(mV)',
            disable_lowPower_alarm: '关闭低电量报警',
            print_str: '输出打印字符 [STR]',
            print_number: '输出打印数字 [NUM]',
            set_servo: '设置舵机 ID [NUM] 位置 [POS] 运行时间 [DURATION] 毫秒',
            action_stop: '停止运行动作组',
            when_minihexa_key_click_thread: '当按键短按时',
            when_minihexa_key_longclick_thread: '当按键长按时',
            key_is_pressed: '按键被按下',
            imu_read_gyro_data: '获取陀螺仪 [SELECT] 轴数值',
            imu_read_angle: '获取 IMU [SELECT] 角度值',
            serial_set_baudrate: '设置串口波特率 [DATA]',
            serial_write: '串口发送数据 [DATA]',
            serial_has_recv_data: '串口已接收数据？',
            serial_recv_contains: '串口接收数据包含 [DATA]？',
            serial_recv_buff: '串口接收缓冲区',
            get_serial_cmd: '解析串口数据 [DATA] 获取命令',
            get_serial_args: '解析串口数据 [DATA] 获取参数 [NUM]',
            clear_buffer: '清空串口缓冲区'
        });
        expect(manifest.menus.rhythms.items.map(item => item.text)).toEqual([
            '二分之一', '四分之一', '八分之一', '一拍', '两拍', '长音', '0'
        ]);
        expect(manifest.menus.buzzer_mode.items.map(item => item.text)).toEqual([
            '后台播放', '前台播放（阻塞）'
        ]);
        expect(manifest.menus.imu_select.items.map(item => item.text)).toEqual(['横滚角', '俯仰角']);
        expect(manifest.blocks.every(block => (
            block.codegen.python.template ||
            block.codegen.python.entryTemplate ||
            block.codegen.python.variables.length
        ))).toBe(true);
        expect(builtinProductManifests.minihexa).toEqual(manifest);
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
                    DIRECTION: {
                        type: 'number',
                        defaultValue: 1
                    }
                },
                codegen: {
                    python: {
                        template: 'move(0)',
                        templateSelector: {
                            argument: 'DIRECTION',
                            cases: {
                                1: 'move(1)'
                            }
                        }
                    }
                }
            }]
        })).toThrow('templateSelector 参数 DIRECTION 必须是固定字段');
    });
});
