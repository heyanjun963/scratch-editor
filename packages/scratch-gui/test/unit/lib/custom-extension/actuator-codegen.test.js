import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {
    composeProductModuleManifest,
    isProductModuleSupported
} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'set_bus_servo',
    'set_bus_servo_motor_speed',
    'load_bus_servo',
    'unload_bus_servo',
    'get_bus_servo_pos',
    'aimecha_iicpwm_init',
    'iicpwm_set_pos',
    'iicpwm_set_speed',
    'aimech_fan_iic_set_module_speed'
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

// 产品主程序和共享动力模块同时参与查询，模拟同一条积木栈的 Python 生成流程。
const getTemplate = blockType => {
    for (const extensionId of ['aihexa', 'actuator']) {
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

describe('actuator built-in Mind+ snapshot', () => {
    test('keeps all migrated actuator categories', () => {
        const manifest = builtinProductManifests.actuator;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'actuator',
            name: '动力模块',
            version: '1.1.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.categories.map(category => category.name)).toEqual([
            '总线舵机',
            'IIC转PWM控制模块',
            '风扇'
        ]);
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(['总线舵机', 'IIC转PWM控制模块', '风扇']);
        expect(manifest.blocks.find(block => block.opcode === 'get_bus_servo_pos'))
            .toMatchObject({blockType: 'reporter', disableMonitor: true});
    });

    test('keeps legacy menus, argument types and defaults', () => {
        const manifest = builtinProductManifests.actuator;
        const block = opcode => manifest.blocks.find(candidate => candidate.opcode === opcode);

        expect(manifest.menus.aimech_iicport.items).toEqual([
            {text: 'A', value: '1'}, {text: 'B', value: '2'}, {text: 'C', value: '3'},
            {text: 'D', value: '4'}, {text: 'E', value: '5'}, {text: 'J', value: '9'},
            {text: 'K', value: '10'}
        ]);
        expect(manifest.menus.iic_pwm_port.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}
        ]);
        expect(manifest.menus.aidoggy_iicport.items).toEqual([
            {text: 'C', value: '3'}, {text: 'D', value: '4'},
            {text: 'E', value: '5'}, {text: 'F', value: '6'}
        ]);
        expect(block('set_bus_servo').arguments).toMatchObject({
            SERVO: {type: 'number', defaultValue: 1},
            POS: {type: 'number', defaultValue: 0},
            TIME: {type: 'number', defaultValue: 100}
        });
        expect(block('set_bus_servo_motor_speed').arguments.SPEED)
            .toMatchObject({type: 'number', defaultValue: 200});
        expect(block('aimecha_iicpwm_init').arguments.PORT)
            .toMatchObject({type: 'string', defaultValue: '1', menu: 'aimech_iicport', literal: true});
        expect(block('iicpwm_set_pos').arguments).toMatchObject({
            NUM: {type: 'string', defaultValue: '1', menu: 'iic_pwm_port', literal: true},
            ANGLE: {type: 'number', defaultValue: 90},
            TIME: {type: 'number', defaultValue: 500}
        });
        expect(block('iicpwm_set_speed').arguments.SPEED)
            .toMatchObject({type: 'number', defaultValue: 0});
        expect(block('set_bus_servo').codegen.python.imports).toEqual(['import Hiwonder']);
        expect(block('aimecha_iicpwm_init').codegen.python.imports).toEqual(['import Hiwonder_DEV']);
        expect(block('aimech_fan_iic_set_module_speed').arguments).toMatchObject({
            PORT: {defaultValue: '1', menu: 'aimech_iicport'},
            SPEED: {type: 'number', defaultValue: 80}
        });
    });

    test('exposes both categories only to products supported by the old library', () => {
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy']
            .forEach(productId => {
                expect(isProductModuleSupported(productId, 'actuator', 'bus-servo')).toBe(true);
                expect(isProductModuleSupported(productId, 'actuator', 'iic-pwm')).toBe(true);
            });
        expect(isProductModuleSupported('minihexa', 'actuator', 'bus-servo')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'actuator', 'iic-pwm')).toBe(false);

        const aidoggyFan = composeProductModuleManifest(
            builtinProductManifests.actuator,
            ['fan'],
            'aidoggy'
        );
        expect(aidoggyFan.blocks[0].arguments.PORT)
            .toMatchObject({defaultValue: '3', menu: 'aidoggy_iicport'});
        expect(Object.keys(aidoggyFan.menus)).toEqual(['aidoggy_iicport']);

        expect(composeProductModuleManifest(
            builtinProductManifests.actuator,
            ['iic-pwm', 'bus-servo']
        ).blocks.map(block => block.opcode)).toEqual([
            'aimecha_iicpwm_init', 'iicpwm_set_pos', 'iicpwm_set_speed',
            'set_bus_servo', 'set_bus_servo_motor_speed', 'load_bus_servo',
            'unload_bus_servo', 'get_bus_servo_pos'
        ]);
    });

    test('generates all nine legacy Python rules and deduplicates device objects', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('actuator_set_bus_servo', {}, {
                SERVO: number(2), POS: number(300), TIME: number(800)
            }),
            new TestBlock('actuator_set_bus_servo_motor_speed', {}, {
                SERVO: number(3), SPEED: number(-200)
            }),
            new TestBlock('actuator_load_bus_servo', {}, {SERVO: number(4)}),
            new TestBlock('actuator_unload_bus_servo', {}, {SERVO: number(5)}),
            new TestBlock('actuator_get_bus_servo_pos', {}, {SERVO: number(6)}),
            new TestBlock('actuator_aimecha_iicpwm_init', {PORT: '9'}),
            new TestBlock('actuator_iicpwm_set_pos', {NUM: '2'}, {
                ANGLE: number(135), TIME: number(600)
            }),
            new TestBlock('actuator_iicpwm_set_speed', {NUM: '1'}, {SPEED: number(-50)}),
            new TestBlock('actuator_aimech_fan_iic_set_module_speed', {PORT: '5'}, {SPEED: number(80)})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'busservos = Hiwonder.BusServo()',
            'busservos.run(2,300,800)',
            'busservos.set_mode(3,1,-200)',
            'busservos.load(4)',
            'busservos.unload(5)',
            'busservos.get_position(6)',
            'iicpwm = Hiwonder_DEV.DEV_PWMModule(Hiwonder_DEV.Port(9))',
            'iicpwm.set_angle(2,135,600,180)',
            'iicpwm.set_speed(1,-50)',
            'iic_fan_5 = Hiwonder_DEV.DEV_FAN(Hiwonder_DEV.Port(5))',
            'iic_fan_5.set_speed(80)'
        ].forEach(line => expect(code).toContain(line));
        expect(code.match(/busservos = Hiwonder\.BusServo\(\)/g)).toHaveLength(1);
        expect(code.match(/iicpwm = Hiwonder_DEV\.DEV_PWMModule/g)).toHaveLength(1);
    });
});
