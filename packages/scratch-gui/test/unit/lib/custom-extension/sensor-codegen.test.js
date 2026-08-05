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
    'get_ultrasonic_distance',
    'aimech_colorsensor_init',
    'aiblocks_check_color',
    'aiblocks_get_color',
    'aiblocks_get_color_arg',
    'aimech_temphumi_init',
    'aimech_get_temp_and_humi',
    'aimech_get_temp_or_humi',
    'aimech_linefollower6_init',
    'linefollower6_one_status',
    'linefollower6_status',
    'linefollower6_set_threshold',
    'linefollower6_get_value',
    'linefollower6_read_offset',
    'aimech_linefollower_init',
    'linefollower_one_status',
    'linefollower_status',
    'linefollower_status_result',
    'linefollower_read_offset',
    'linefollower4_init',
    'linefollower4_one_status',
    'linefollower4_status_result',
    'linefollower4_read_offset'
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
    test('keeps all migrated sensor batches and toolbox labels', () => {
        const manifest = builtinProductManifests.sensor;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'sensor',
            name: '输入模块',
            version: '1.3.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            '旋钮', '光线传感器', '雨滴传感器', '土壤传感器', '声音传感器',
            '红外检测传感器', '触摸传感器', '按键模块', '超声波传感器',
            '颜色识别模块', '温湿度传感器', '六路巡线传感器',
            '四路巡线传感器', '旋钮四路巡线传感器'
        ]);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(manifest.categories.map(category => category.name));
        manifest.blocks
            .filter(block => block.blockType === 'reporter' || block.blockType === 'boolean')
            .forEach(block => expect(block.disableMonitor).toBe(true));
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
        expect(manifest.menus.aiblocks_colors.items).toEqual([
            {text: '红', value: '1'}, {text: '绿', value: '2'}, {text: '蓝', value: '3'}
        ]);
        expect(manifest.menus.aiblocks_colors2.items).toEqual([
            {text: '红', value: '0'}, {text: '绿', value: '1'}, {text: '蓝', value: '2'}
        ]);
        expect(manifest.menus.temphumi.items).toEqual([
            {text: '温度', value: '0'}, {text: '湿度', value: '1'}
        ]);
        expect(manifest.menus.linefollows6Mask.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}, {text: '3', value: '4'},
            {text: '4', value: '8'}, {text: '5', value: '16'}, {text: '6', value: '32'}
        ]);
        expect(manifest.menus.linefollows6.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}, {text: '3', value: '3'},
            {text: '4', value: '4'}, {text: '5', value: '5'}, {text: '6', value: '6'}
        ]);
        expect(manifest.menus.linedot2.items).toEqual([
            {text: '◌', value: '0'}, {text: '●', value: '1'}
        ]);
        expect(manifest.menus.linefollows4Mask.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'},
            {text: '3', value: '4'}, {text: '4', value: '8'}
        ]);
        expect(manifest.menus.linedot).toBeUndefined();
        expect(manifest.blocks.find(block => block.opcode === 'linefollower6_status').arguments.LINE)
            .toMatchObject({type: 'line6', scratchType: 'line6', defaultValue: '00'});
        expect(manifest.blocks.find(block => block.opcode === 'linefollower_status').arguments.LINE)
            .toMatchObject({type: 'line4', scratchType: 'line4', defaultValue: '00'});
        ['linefollower_status_result', 'linefollower4_status_result'].forEach(opcode => {
            expect(manifest.blocks.find(block => block.opcode === opcode).arguments.VALUE)
                .toMatchObject({type: 'line4', scratchType: 'line4', defaultValue: '00'});
        });
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

    test('generates the legacy color and temperature-humidity calls', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_colorsensor_init', {PORT: '2'}),
            new TestBlock('sensor_aiblocks_check_color', {COLOR: '3'}),
            new TestBlock('sensor_aiblocks_get_color'),
            new TestBlock('sensor_aiblocks_get_color_arg', {COLOR: '1'}, {
                NUM: new TestBlock('math_number', {NUM: 7})
            }),
            new TestBlock('sensor_aimech_temphumi_init', {PORT: '4'}),
            new TestBlock('sensor_aimech_get_temp_and_humi'),
            new TestBlock('sensor_aimech_get_temp_or_humi', {TEMPHUMI: '1'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'color = Hiwonder_DEV.DEV_COLOR_RECOGNIZE(Hiwonder_DEV.Port(2))',
            'color.get_color_name() == 3',
            'color.get_color_data()',
            '7[1]',
            'temphumi = Hiwonder_DEV.DEV_TH(Hiwonder_DEV.Port(4))',
            'temphumi.read_Temp_Humi()',
            'temphumi.read_Temp_Humi()[1]'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates the legacy six-line follower initialization, masks and readings', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_linefollower6_init', {PORT: '5'}),
            new TestBlock('sensor_linefollower6_one_status', {NUM: '8', LINE: '0'}),
            new TestBlock('sensor_linefollower6_one_status', {NUM: '32', LINE: '1'}),
            new TestBlock('sensor_linefollower6_status', {}, {
                LINE: new TestBlock('line6', {LINE6: '15'})
            }),
            new TestBlock('sensor_linefollower6_set_threshold', {}, {
                VALUE: new TestBlock('math_number', {NUM: 6})
            }),
            new TestBlock('sensor_linefollower6_get_value', {NUM: '6'}),
            new TestBlock('sensor_linefollower6_read_offset')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'linefollow6 = Hiwonder_DEV.DEV_LINE_FOLLOW_6(Hiwonder_DEV.Port(5))',
            '(linefollow6.get_result_data() & 8) == 0',
            '(linefollow6.get_result_data() & 32) > 0',
            'linefollow6.get_result_data() == 0x15',
            'linefollow6.set_ThresholdRatioReg(6)',
            'linefollow6.read_AnalogQuantity(6)',
            'linefollow6.read_offset()'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates both legacy four-line follower variants', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_linefollower_init', {PORT: '2'}),
            new TestBlock('sensor_linefollower_one_status', {NUM: '4', LINE: '1'}),
            new TestBlock('sensor_linefollower_status', {}, {
                LINE: new TestBlock('line4', {LINE4: '0f'})
            }),
            new TestBlock('sensor_linefollower_status_result', {}, {
                VALUE: new TestBlock('line4', {LINE4: '09'})
            }),
            new TestBlock('sensor_linefollower_read_offset'),
            new TestBlock('sensor_linefollower4_init', {PORT: '3'}),
            new TestBlock('sensor_linefollower4_one_status', {NUM: '8', LINE: '0'}),
            new TestBlock('sensor_linefollower4_status_result', {}, {
                VALUE: new TestBlock('line4', {LINE4: '0f'})
            }),
            new TestBlock('sensor_linefollower4_read_offset')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'linefollow = Hiwonder_DEV.DEV_LINE_FOLLOW_4(Hiwonder_DEV.Port(2))',
            '(linefollow.get_result_data() & 4) > 0',
            'linefollow.get_result_data() == 0x0f',
            'linefollow.get_result_data() == 0x09',
            'linefollow.read_offset()',
            'linefollow4 = Hiwonder_DEV.DEV_LINE_FOLLOW_4_O(Hiwonder_DEV.Port(3))',
            '(linefollow4.get_result_data() & 8) == 0',
            'linefollow4.get_result_data() == 0x0f',
            'linefollow4.read_offset()'
        ].forEach(line => expect(code).toContain(line));
    });
});
