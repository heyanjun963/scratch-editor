import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {
    composeProductModuleManifest,
    isProductModuleSupported
} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'aimech_set_arm_id',
    'aimech_set_claw_id',
    'aimech_servo_enable',
    'aimech_servo_disable',
    'aimech_set_servo_pose_time',
    'aimech_get_angle',
    'aimech_set_servo_stop',
    'aimech_3dof_arm_init',
    'aimech_3dof_arm_move',
    'aimech_rod_arm_init',
    'aimech_rod_reach_detect',
    'aimech_rod_arm_move'
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

// 产品主程序和共享机械臂模块同时参与查询，覆盖变量区、初始化区与主程序代码顺序。
const getTemplate = blockType => {
    for (const extensionId of ['aimech', 'xarm']) {
        const manifest = builtinProductManifests[extensionId];
        if (!manifest || !blockType.startsWith(`${extensionId}_`)) continue;
        const opcode = blockType.slice(extensionId.length + 1);
        const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
        if (block) {
            return {
                blockType: block.blockType,
                arguments: block.arguments,
                ...block.codegen.python
            };
        }
    }
    return null;
};

describe('xarm built-in Mind+ snapshot', () => {
    test('keeps all three complete mechanical arm categories', () => {
        const manifest = builtinProductManifests.xarm;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'xarm',
            name: '机械臂模块',
            version: '1.1.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.categories.map(category => category.name)).toEqual([
            '机械臂',
            'AI机甲串联机械臂',
            '连杆机械臂'
        ]);
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(['机械臂', 'AI机甲串联机械臂', '连杆机械臂']);
        expect(manifest.blocks.find(block => block.opcode === 'aimech_get_angle'))
            .toMatchObject({blockType: 'reporter', disableMonitor: true});
        expect(manifest.blocks.find(block => block.opcode === 'aimech_rod_reach_detect'))
            .toMatchObject({blockType: 'boolean', disableMonitor: true});
    });

    test('keeps legacy menus and defaults', () => {
        const manifest = builtinProductManifests.xarm;
        const block = opcode => manifest.blocks.find(candidate => candidate.opcode === opcode);

        expect(manifest.menus.arm.items).toEqual([
            {text: '机械臂', value: '_armId'},
            {text: '机械爪', value: '_clawId'}
        ]);
        expect(manifest.menus.arm_3dof.items).toEqual([
            {text: '短机械臂', value: '0'},
            {text: '长机械臂', value: '1'}
        ]);
        expect(manifest.menus.delay_select.items).toEqual([
            {text: '不延时', value: 'False'},
            {text: '延时', value: 'True'}
        ]);
        expect(block('aimech_set_arm_id').arguments.SERVO).toMatchObject({
            type: 'number', defaultValue: 2
        });
        expect(block('aimech_set_claw_id').arguments.SERVO).toMatchObject({
            type: 'number', defaultValue: 1
        });
        expect(block('aimech_servo_enable').arguments.ARM).toMatchObject({
            type: 'string', defaultValue: '_armId', menu: 'arm', literal: true
        });
        expect(block('aimech_set_servo_pose_time').arguments).toMatchObject({
            ARM: {defaultValue: '_armId', menu: 'arm'},
            POS: {type: 'number', defaultValue: 500},
            TIME: {type: 'number', defaultValue: 500}
        });
        expect(block('aimech_3dof_arm_init').arguments).toMatchObject({
            ARM: {defaultValue: '0', menu: 'arm_3dof'},
            VALUE1: {type: 'number', defaultValue: 55},
            VALUE2: {type: 'number', defaultValue: 76},
            VALUE3: {type: 'number', defaultValue: 27},
            VALUE4: {type: 'number', defaultValue: 120}
        });
        expect(block('aimech_rod_arm_move').arguments).toMatchObject({
            VALUE1: {type: 'number', defaultValue: 0},
            VALUE2: {type: 'number', defaultValue: 0},
            VALUE3: {type: 'number', defaultValue: 1000},
            VALUE4: {type: 'string', defaultValue: 'False', menu: 'delay_select', literal: true}
        });
    });

    test('keeps product support boundaries from the old library', () => {
        expect(isProductModuleSupported('aimech', 'xarm', 'xarm')).toBe(true);
        ['aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy']
            .forEach(productId => expect(isProductModuleSupported(productId, 'xarm', 'xarm')).toBe(false));
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy']
            .forEach(productId => expect(isProductModuleSupported(productId, 'xarm', 'xarm-series')).toBe(true));
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy']
            .forEach(productId => expect(isProductModuleSupported(productId, 'xarm', 'xarm-linkage')).toBe(true));
        expect(isProductModuleSupported('minihexa', 'xarm', 'xarm')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'xarm', 'xarm-series')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'xarm', 'xarm-linkage')).toBe(false);

        expect(composeProductModuleManifest(
            builtinProductManifests.xarm,
            ['xarm-linkage', 'xarm-series', 'xarm']
        ).blocks.map(block => block.opcode)).toEqual([
            'aimech_rod_arm_init', 'aimech_rod_reach_detect', 'aimech_rod_arm_move',
            'aimech_3dof_arm_init', 'aimech_3dof_arm_move',
            'aimech_set_arm_id', 'aimech_set_claw_id', 'aimech_servo_enable',
            'aimech_servo_disable', 'aimech_set_servo_pose_time', 'aimech_get_angle',
            'aimech_set_servo_stop'
        ]);
    });

    test('generates all twelve legacy rules and applies custom IDs after defaults', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
        const main = new TestBlock('aimech_start_thread');
        const blocks = [
            new TestBlock('xarm_aimech_set_arm_id', {}, {SERVO: number(7)}),
            new TestBlock('xarm_aimech_set_claw_id', {}, {SERVO: number(8)}),
            new TestBlock('xarm_aimech_servo_enable', {ARM: '_armId'}),
            new TestBlock('xarm_aimech_servo_disable', {ARM: '_clawId'}),
            new TestBlock('xarm_aimech_set_servo_pose_time', {ARM: '_armId'}, {
                POS: number(600), TIME: number(900)
            }),
            new TestBlock('xarm_aimech_get_angle', {ARM: '_clawId'}),
            new TestBlock('xarm_aimech_set_servo_stop', {ARM: '_armId'}),
            new TestBlock('xarm_aimech_3dof_arm_init', {ARM: '1'}, {
                VALUE1: number(55), VALUE2: number(76), VALUE3: number(27), VALUE4: number(120)
            }),
            new TestBlock('xarm_aimech_3dof_arm_move', {}, {
                VALUE1: number(10), VALUE2: number(20), VALUE3: number(-15), VALUE4: number(1000)
            }),
            new TestBlock('xarm_aimech_rod_arm_init'),
            new TestBlock('xarm_aimech_rod_reach_detect', {}, {
                VALUE1: number(30), VALUE2: number(40)
            }),
            new TestBlock('xarm_aimech_rod_arm_move', {VALUE4: 'True'}, {
                VALUE1: number(30), VALUE2: number(40), VALUE3: number(1200)
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            '_armId = 2',
            '_clawId = 1',
            '_armId = 7',
            '_clawId = 8',
            'busservos = Hiwonder.BusServo()',
            'busservos.load(_armId)',
            'busservos.unload(_clawId)',
            'busservos.run(_armId,600,900)',
            'busservos.get_position(_clawId)',
            'busservos.stop(_armId)',
            'dof3Arm = Hiwonder.Arm_3DOF(55,76,27,120,1)',
            'dof3Arm.move_to_yz(10,20,-15,1000)',
            'rodArm = Hiwonder.Arm_Link()',
            'rodArm.is_s1s2_angle(30,40)',
            'rodArm.move_to_yz(30,40,1200,True)'
        ].forEach(line => expect(code).toContain(line));
        expect(code.indexOf('_armId = 2')).toBeLessThan(code.indexOf('_armId = 7'));
        expect(code.indexOf('_clawId = 1')).toBeLessThan(code.indexOf('_clawId = 8'));
        expect(code.match(/busservos = Hiwonder\.BusServo\(\)/g)).toHaveLength(1);
        expect(code.match(/^import Hiwonder$/gm)).toHaveLength(1);
    });
});
