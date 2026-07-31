import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';

const EXPECTED_OPCODES = [
    'start_thread', 'start_run_thread', 'buzzer_tone_set', 'buzzer_tone_set_arg',
    'buzzer_tone_set_volume', 'close_buzzer', 'close_lowpower_warning', 'get_battery_level',
    'set_led_color', 'set_led_color_arg', 'rgb_module_breath_one', 'rgb_module_breath',
    'close_led', 'print_str', 'print_number', 'when_key_click_thread',
    'when_key_longclick_thread', 'key_is_pressed', 'robot_reset', 'robot_move_step',
    'robot_move', 'robot_move_offset', 'robot_move_step_arg', 'robot_stop_run',
    'robot_run_action', 'robot_servo_set', 'get_robot_servo_pos', 'imu_init', 'imu_cali',
    'get_euler_angle_element_value', 'set_ble_mode', 'ble_is_connected', 'get_ble_mac',
    'ble_wait_end', 'read_ble_data', 'get_ble_cmd', 'get_ble_args', 'ble_write'
];

class TestBlock {
    constructor (type, fields = {}, inputs = {}) {
        this.type = type;
        this.fields = fields;
        this.inputs = inputs;
        this.next = null;
    }

    getFieldValue (name) {
        return this.fields[name];
    }

    getInputTargetBlock (name) {
        return this.inputs[name] || null;
    }

    getNextBlock () {
        return this.next;
    }
}

const createWorkspace = topBlocks => ({
    getTopBlocks: () => topBlocks
});

// 测试直接读取内置 manifest，保证本地离线包注册后参与 VM Python 代码生成。
const getAIQuadrupedTemplate = blockType => {
    const manifest = builtinProductManifests.aiquadruped;
    if (!manifest || !blockType.startsWith(`${manifest.id}_`)) return null;
    const opcode = blockType.slice(manifest.id.length + 1);
    const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

describe('AI quadruped built-in Mind+ snapshot', () => {
    test('keeps the complete enabled block surface and local catalog state', () => {
        const manifest = builtinProductManifests.aiquadruped;
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'aiquadruped');

        expect(manifest).toMatchObject({
            id: 'aiquadruped',
            name: 'AI机甲四足机器人',
            version: '1.0.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            '主程序', '板载资源', 'RGB彩灯', '输出打印', '按键', '运动控制', 'IMU传感器', '蓝牙通信'
        ]);
        expect(Object.keys(manifest.menus)).toEqual([
            'tones', 'rhythms', 'buzzerMode', 'lightColors', 'keys',
            'moves', 'moves2', 'actions', 'eulerElement', 'bleMode'
        ]);
        expect(catalogItem).toMatchObject({
            version: '1.0.0',
            latestVersion: '1.0.0',
            status: 'available'
        });
    });

    test('disables stage monitors for Python reporter and boolean blocks', () => {
        const manifest = builtinProductManifests.aiquadruped;
        const valueBlocks = manifest.blocks.filter(block => (
            block.blockType === 'reporter' || block.blockType === 'boolean'
        ));
        const extensionInfo = manifestToExtensionObject(manifest).getInfo();
        const extensionBlocks = extensionInfo.blocks.filter(block => block && block.opcode);

        expect(valueBlocks.length).toBeGreaterThan(0);
        expect(valueBlocks.every(block => block.disableMonitor)).toBe(true);
        valueBlocks.forEach(block => {
            expect(extensionBlocks.find(candidate => candidate.opcode === block.opcode).disableMonitor).toBe(true);
        });
    });

    test('generates legacy quadruped movement and servo calls', () => {
        const main = new TestBlock('aiquadruped_start_thread');
        const moveStep = new TestBlock('aiquadruped_robot_move_step', {
            MOVE: '2',
            STEP: 8,
            DURATION: 400,
            VALUE1: 20,
            VALUE2: 6
        });
        const moveOffset = new TestBlock('aiquadruped_robot_move_offset', {
            MOVE: '1',
            OFFSET: -3,
            DURATION: 500,
            VALUE1: 25,
            VALUE2: 10
        });
        const action = new TestBlock('aiquadruped_robot_run_action', {
            ACTION: '6',
            STEP: 3,
            DURATION: 600
        });
        const servo = new TestBlock('aiquadruped_robot_servo_set', {
            ID: 11,
            POS: 520,
            DURATION: 300
        });
        const servoPosition = new TestBlock('aiquadruped_get_robot_servo_pos', {NUM: 11});
        const print = new TestBlock('aiquadruped_print_number', {}, {NUM: servoPosition});
        main.next = moveStep;
        moveStep.next = moveOffset;
        moveOffset.next = action;
        action.next = servo;
        servo.next = print;

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getAIQuadrupedTemplate
        });

        expect(code).toContain('quadruped = Hiwonder_DEV.DEV_Quadruped_Board(Hiwonder_DEV.Port(9))');
        expect(code).toContain('quadruped.move(2,8,400,20,6)');
        expect(code).toContain('quadruped.move(1,-1,500,25,10,-3)');
        expect(code).toContain('quadruped.move(6,3,600)');
        expect(code).toContain('quadruped.set_servo_pose(11,520,300)');
        expect(code).toContain('print(quadruped.read_servo_pose(11))');
    });

    test('forces calibrated IMU initialization regardless of block order', () => {
        ['init-first', 'calibration-first'].forEach(order => {
            const main = new TestBlock('aiquadruped_start_thread');
            const init = new TestBlock('aiquadruped_imu_init');
            const calibration = new TestBlock('aiquadruped_imu_cali');
            main.next = order === 'init-first' ? init : calibration;
            main.next.next = order === 'init-first' ? calibration : init;

            const code = generatePythonCode(createWorkspace([main]), {
                getPythonCodegenTemplate: getAIQuadrupedTemplate
            });

            expect(code).not.toContain('imu = Hiwonder.IMU()');
            expect(code).toContain('imu = Hiwonder.IMU(True, is_stop_3091ratyxq)');
        });
    });
});
