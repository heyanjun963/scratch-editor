import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';

const EXPECTED_OPCODES = [
    'aimech_read_knob',
    'aimech_read_light',
    'aimech_get_rain_drop_value',
    'aimech_get_soil_value',
    'aimech_read_sound',
    'aimech_get_avoid_value',
    'aimech_read_touch',
    'aimech_key_is_pressed',
    'get_ultrasonic_distance'
];

class TestBlock {
    constructor (type, fields = {}) {
        this.type = type;
        this.fields = fields;
        this.next = null;
    }

    getFieldValue (name) {
        return this.fields[name];
    }

    getInputTargetBlock () {
        return null;
    }

    getNextBlock () {
        return this.next;
    }
}

const createWorkspace = topBlocks => ({
    getTopBlocks: () => topBlocks
});

// 产品主程序和共享输入模块同时参与查询，模拟用户实际搭建的同一条积木栈。
const getTemplate = blockType => {
    for (const extensionId of ['aihexa', 'sensor']) {
        const manifest = builtinProductManifests[extensionId];
        if (!blockType.startsWith(`${extensionId}_`)) continue;
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

describe('sensor built-in Mind+ snapshot', () => {
    test('keeps the first migrated sensor surface and toolbox labels', () => {
        const manifest = builtinProductManifests.sensor;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'sensor',
            name: '输入模块',
            version: '1.0.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            '旋钮', '光线传感器', '雨滴传感器', '土壤传感器', '声音传感器',
            '红外检测传感器', '触摸传感器', '按键模块', '超声波传感器'
        ]);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(manifest.categories.map(category => category.name));
        manifest.blocks.forEach(block => expect(block.disableMonitor).toBe(true));
    });

    test('keeps the legacy port menus and defaults', () => {
        const manifest = builtinProductManifests.sensor;

        expect(manifest.menus.aimech_iicport.items).toEqual([
            {text: 'A', value: '1'}, {text: 'B', value: '2'}, {text: 'C', value: '3'},
            {text: 'D', value: '4'}, {text: 'E', value: '5'}, {text: 'J', value: '9'},
            {text: 'K', value: '10'}
        ]);
        expect(manifest.menus.ultra_port.items).toEqual([
            {text: '2', value: '2'}, {text: '6', value: '6'}, {text: '8', value: '8'}
        ]);
        expect(manifest.blocks.slice(0, 8).every(block => block.arguments.PORT.defaultValue === '1')).toBe(true);
        expect(manifest.blocks[8].arguments.ULTRA_PORT.defaultValue).toBe('2');
    });

    test('generates all nine legacy Python calls including dynamic port variable names', () => {
        const main = new TestBlock('aihexa_start_thread');
        const sensorBlocks = [
            new TestBlock('sensor_aimech_read_knob', {PORT: '1'}),
            new TestBlock('sensor_aimech_read_light', {PORT: '2'}),
            new TestBlock('sensor_aimech_get_rain_drop_value', {PORT: '3'}),
            new TestBlock('sensor_aimech_get_soil_value', {PORT: '4'}),
            new TestBlock('sensor_aimech_read_sound', {PORT: '5'}),
            new TestBlock('sensor_aimech_get_avoid_value', {PORT: '9'}),
            new TestBlock('sensor_aimech_read_touch', {PORT: '10'}),
            new TestBlock('sensor_aimech_key_is_pressed', {PORT: '1'}),
            new TestBlock('sensor_get_ultrasonic_distance', {ULTRA_PORT: '8'})
        ];
        sensorBlocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'knob = Hiwonder_DEV.DEV_KNOB(Hiwonder_DEV.Port(1))',
            'light = Hiwonder_DEV.DEV_LIGHT(Hiwonder_DEV.Port(2))',
            'rain = Hiwonder_DEV.DEV_RAIN(Hiwonder_DEV.Port(3))',
            'soil = Hiwonder_DEV.DEV_SOIL(Hiwonder_DEV.Port(4,0x5A))',
            'sound = Hiwonder_DEV.DEV_SOUND(Hiwonder_DEV.Port(5))',
            'ir_9 = Hiwonder_DEV.DEV_IR(Hiwonder_DEV.Port(9))',
            'touch = Hiwonder_DEV.DEV_TOUCH(Hiwonder_DEV.Port(10))',
            'key = Hiwonder_DEV.DEV_BUTTON(Hiwonder_DEV.Port(1))',
            'sonar_8 = Hiwonder.Sonar(Hiwonder.Port(8))',
            'ir_9.read_state()',
            'sonar_8.read()'
        ].forEach(line => expect(code).toContain(line));
        expect(code).toContain('import Hiwonder_DEV');
        expect(code).toContain('import Hiwonder');
    });
});
