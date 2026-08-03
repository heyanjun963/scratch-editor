import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';

const EXPECTED_OPCODES = [
    'start_thread', 'start_run_thread', 'buzzer_tone_set', 'buzzer_tone_set_arg',
    'buzzer_tone_set_volume', 'close_buzzer', 'close_lowpower_warning', 'get_battery_level',
    'set_led_color', 'set_led_color_arg', 'rgb_module_breath_one', 'rgb_module_breath',
    'close_led', 'print_str', 'print_number', 'when_key_click_thread',
    'when_key_longclick_thread', 'key_is_pressed', 'robot_init_foot', 'robot_set_foot',
    'robot_reset', 'robot_move', 'robot_move_step', 'robot_move_xyz',
    'robot_move_xyz_step', 'robot_stop_run', 'robot_run_action', 'robot_stop_action',
    'robot_height', 'robot_run_pose', 'robot_servo_set', 'get_robot_servo_pos',
    'set_all_robot_servo_load', 'imu_init', 'imu_cali', 'get_euler_angle_element_value',
    'set_ble_mode', 'ble_is_connected', 'get_ble_mac', 'ble_wait_end',
    'read_ble_data', 'get_ble_cmd', 'get_ble_args', 'ble_write'
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

// 测试直接读取内置 manifest，保证离线产品包参与 VM Python 代码生成。
const getAIQuadrupedProTemplate = blockType => {
    const manifest = builtinProductManifests.aiquadrupedpro;
    if (!manifest || !blockType.startsWith(`${manifest.id}_`)) return null;
    const opcode = blockType.slice(manifest.id.length + 1);
    const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

const generateForBlocks = blocks => {
    const main = new TestBlock('aiquadrupedpro_start_thread');
    let current = main;
    blocks.forEach(block => {
        current.next = block;
        current = block;
    });
    return generatePythonCode(createWorkspace([main]), {
        getPythonCodegenTemplate: getAIQuadrupedProTemplate
    });
};

describe('AI quadruped pro built-in Mind+ snapshot', () => {
    test('keeps the complete enabled block surface and local catalog state', () => {
        const manifest = builtinProductManifests.aiquadrupedpro;
        const catalogItem = productExtensionCatalog
            .flatMap(category => category.children)
            .find(item => item.id === 'aiquadrupedpro');

        expect(manifest).toMatchObject({
            id: 'aiquadrupedpro',
            name: 'AI机甲四足竞赛版',
            version: '1.0.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            '主程序', '板载资源', 'RGB彩灯', '输出打印', '按键', '运动控制', 'IMU传感器', '蓝牙通信'
        ]);
        expect(Object.keys(manifest.menus)).toEqual([
            'tones', 'rhythms', 'buzzerMode', 'lightColors', 'keys',
            'moves', 'heightChange', 'servoLoad', 'eulerElement', 'bleMode'
        ]);
        expect(catalogItem).toMatchObject({
            version: '1.0.0',
            latestVersion: '1.0.0',
            status: 'available'
        });
    });

    test('disables stage monitors for every value block', () => {
        const manifest = builtinProductManifests.aiquadrupedpro;
        const valueBlocks = manifest.blocks.filter(block => (
            block.blockType === 'reporter' || block.blockType === 'boolean'
        ));
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks
            .filter(block => block && block.opcode);

        expect(valueBlocks).toHaveLength(10);
        valueBlocks.forEach(block => {
            expect(block.disableMonitor).toBe(true);
            expect(extensionBlocks.find(candidate => candidate.opcode === block.opcode).disableMonitor).toBe(true);
        });
    });

    test('maps every legacy movement direction to the final XYZ call', () => {
        const expectedCalls = {
            0: 'quadrupedpro.move(0,20,0,15,500,-1)',
            1: 'quadrupedpro.move(0,-20,0,15,500,-1)',
            2: 'quadrupedpro.move(-20,0,0,15,500,-1)',
            3: 'quadrupedpro.move(20,0,0,15,500,-1)',
            4: 'quadrupedpro.move(0,0,20,15,500,-1)',
            5: 'quadrupedpro.move(0,0,-20,15,500,-1)'
        };

        Object.entries(expectedCalls).forEach(([oriention, expectedCall]) => {
            const move = new TestBlock('aiquadrupedpro_robot_move', {
                ORIENTION: oriention,
                VALUE: 20,
                HEIGHT: 15,
                PERIOD: 500
            });
            expect(generateForBlocks([move])).toContain(expectedCall);
        });
    });

    test('generates step movement, pose, action and servo load calls', () => {
        const moveStep = new TestBlock('aiquadrupedpro_robot_move_step', {
            ORIENTION: '2',
            VALUE: 25,
            HEIGHT: 18,
            PERIOD: 600,
            VALUE2: 8
        });
        const pose = new TestBlock('aiquadrupedpro_robot_run_pose', {
            TIME: 1000,
            VALUE1: 1,
            VALUE2: 2,
            VALUE3: 3,
            PITCH: 4,
            ROLL: 5,
            YAW: 6
        });
        const action = new TestBlock('aiquadrupedpro_robot_run_action', {ACTION: 'wave', STEP: 3});
        const load = new TestBlock('aiquadrupedpro_set_all_robot_servo_load', {LOAD: '0'});

        const code = generateForBlocks([moveStep, pose, action, load]);

        expect(code).toContain('quadrupedpro = Hiwonder_DEV.DEV_Quadruped_3DOF(Hiwonder_DEV.Port(9))');
        expect(code).toContain('quadrupedpro.move(-25,0,0,18,600,8)');
        expect(code).toContain('quadrupedpro.set_pose(1,2,3,4,5,6,1000)');
        expect(code).toContain('quadrupedpro.action_run("wave",3)');
        expect(code).toContain('quadrupedpro.set_LoadOrUnload(0)');
    });

    test('forces foot and calibrated IMU initialization regardless of block order', () => {
        ['initializers-first', 'defaults-first'].forEach(order => {
            const foot = new TestBlock('aiquadrupedpro_robot_init_foot', {
                VALUE1: 110,
                VALUE2: 0,
                VALUE3: -60
            });
            const reset = new TestBlock('aiquadrupedpro_robot_reset');
            const imuInit = new TestBlock('aiquadrupedpro_imu_init');
            const imuCalibration = new TestBlock('aiquadrupedpro_imu_cali');
            const blocks = order === 'initializers-first' ?
                [foot, imuCalibration, reset, imuInit] :
                [reset, imuInit, foot, imuCalibration];

            const code = generateForBlocks(blocks);

            expect(code).not.toContain('quadrupedpro = Hiwonder_DEV.DEV_Quadruped_3DOF(Hiwonder_DEV.Port(9))\n');
            expect(code).toContain(
                'quadrupedpro = Hiwonder_DEV.DEV_Quadruped_3DOF(Hiwonder_DEV.Port(9),110,0,-60)'
            );
            expect(code).not.toContain('imu = Hiwonder.IMU()');
            expect(code).toContain('imu = Hiwonder.IMU(True, is_stop_3091ratyxq)');
        });
    });
});
