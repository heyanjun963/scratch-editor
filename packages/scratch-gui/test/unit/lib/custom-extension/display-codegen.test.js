import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {
    composeProductModuleManifest,
    isProductModuleSupported
} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'aimech_rgb_module_color_set',
    'aimech_rgb_module_color_select',
    'aimech_rgb_module_breath_one',
    'aimech_rgb_module_breath',
    'aimech_rgb_module_close',
    'aimech_matrixLed_brightness',
    'aimech_matrixLed_show_num',
    'aimech_matrixLed_show_str',
    'aimech_matrixLed_pos_onoff',
    'aimech_matrix_led',
    'aimech_clear_matrix_led',
    'aiblocksboard_matrixLed_brightness',
    'aiblocksboard_matrixLed_show_num',
    'aiblocksboard_matrixLed_show_str',
    'aiblocksboard_matrixLed_pos_onoff',
    'aiblocksboard_matrix_led',
    'aiblocksboard_clear_matrix_led',
    'aimech_digit_show_num',
    'aiblocksboard_digit_show_num',
    'aimech_oled_init',
    'aiblocks_oled_init',
    'oled_draw_ascii',
    'oled_point',
    'oled_clear',
    'oled_draw_hline',
    'oled_draw_vline',
    'oled_draw_line',
    'oled_draw_rect',
    'mp3_init',
    'mp3_play_song_num',
    'mp3_play_control',
    'mp3_play_mode',
    'mp3_set_volume',
    'rgb_color_set',
    'led_color_select',
    'led_close',
    'fan_module_speed',
    'aiblocks_fan_iic_set_module_speed'
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

const getTemplate = blockType => {
    for (const extensionId of ['aihexa', 'display']) {
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

describe('display built-in Mind+ snapshot', () => {
    test('keeps the complete RGB and dot matrix categories and menus', () => {
        const manifest = builtinProductManifests.display;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'display',
            name: '输出模块',
            version: '1.4.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.categories.map(category => category.name)).toEqual([
            'RGB模块', '点阵屏', '数码管', 'OLED-12864', 'MP3 模块', 'RGB 灯带', '风扇模块',
            'IIC 风扇'
        ]);
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual([
                'RGB模块', '点阵屏', '数码管', 'OLED-12864', 'MP3 模块', 'RGB 灯带', '风扇模块',
                'IIC 风扇'
            ]);
        expect(manifest.menus.aimech_iicport.items).toHaveLength(7);
        expect(manifest.menus.light_colors.items).toEqual([
            {text: '红', value: '0'}, {text: '绿', value: '1'}, {text: '蓝', value: '2'},
            {text: '黄', value: '3'}, {text: '紫', value: '4'}, {text: '青', value: '5'},
            {text: '白', value: '6'}
        ]);
        expect(manifest.blocks.find(block => block.opcode === 'aimech_rgb_module_color_select')
            .arguments.COLOR).toMatchObject({type: 'color', defaultValue: '#ff0000'});
        expect(manifest.blocks.find(block => block.opcode === 'aimech_matrix_led')
            .arguments.MATRIX).toMatchObject({type: 'ledmatrix', defaultValue: '1'.repeat(128)});
        expect(manifest.menus.aiblocks_iicport.items.map(item => item.value)).toEqual(['1', '2', '3', '4']);
        expect(manifest.menus.aidoggy_iicport.items.map(item => item.value)).toEqual(['3', '4', '5', '6']);
        expect(manifest.menus.shapetype.items).toEqual([
            {text: '空心', value: '0'}, {text: '实心', value: '1'}
        ]);
    });

    test('keeps the legacy MP3, RGB strip and fan menus', () => {
        const manifest = builtinProductManifests.display;

        expect(manifest.menus.mp3_port.items.map(item => item.value)).toEqual(['3', '4', '5', '6', '9']);
        expect(manifest.menus.play_status.items.map(item => item.value)).toEqual(['0', '1', '2', '3']);
        expect(manifest.menus.nums.items).toHaveLength(16);
    });

    test('keeps the old product support boundary', () => {
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa']
            .forEach(productId => expect(isProductModuleSupported(productId, 'display', 'rgb-module')).toBe(true));
        expect(isProductModuleSupported('aidoggy', 'display', 'rgb-module')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'display', 'rgb-module')).toBe(false);
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa']
            .forEach(productId => {
                expect(isProductModuleSupported(productId, 'display', 'digit-display')).toBe(true);
                expect(isProductModuleSupported(productId, 'display', 'oled')).toBe(true);
            });
        expect(isProductModuleSupported('aidoggy', 'display', 'digit-display')).toBe(false);
        expect(isProductModuleSupported('aidoggy', 'display', 'oled')).toBe(false);
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy', 'minihexa']
            .forEach(productId => {
                expect(isProductModuleSupported(productId, 'display', 'mp3')).toBe(false);
                expect(isProductModuleSupported(productId, 'display', 'rgb-light')).toBe(false);
                expect(isProductModuleSupported(productId, 'display', 'fan')).toBe(false);
                expect(isProductModuleSupported(productId, 'display', 'fan-iic')).toBe(false);
            });
    });

    test('filters RGB from AiDoggy and applies its point matrix ports', () => {
        const manifest = composeProductModuleManifest(
            builtinProductManifests.display,
            ['rgb-module', 'dot-matrix'],
            'aidoggy'
        );

        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES.slice(5, 11));
        manifest.blocks.forEach(block => {
            expect(block.arguments.PORT).toMatchObject({menu: 'aidoggy_iicport', defaultValue: '3'});
        });
        expect(manifest.menus.aimech_iicport).toBeUndefined();
        expect(manifest.menus.aidoggy_iicport.items.map(item => item.value)).toEqual(['3', '4', '5', '6']);

        const largeProductManifest = composeProductModuleManifest(
            builtinProductManifests.display,
            ['digit-display', 'oled'],
            'aihexa'
        );
        expect(largeProductManifest.blocks.map(block => block.opcode)).toEqual([
            'aimech_digit_show_num',
            'aimech_oled_init',
            'oled_draw_ascii',
            'oled_point',
            'oled_clear',
            'oled_draw_hline',
            'oled_draw_vline',
            'oled_draw_line',
            'oled_draw_rect'
        ]);
        expect(largeProductManifest.menus.aimech_iicport.items.map(item => item.value)).toEqual([
            '1', '2', '3', '4', '5', '9', '10'
        ]);
    });

    test('composes the old AIBlocksBoard output branch without leaking AI product blocks', () => {
        const manifest = composeProductModuleManifest(
            builtinProductManifests.display,
            ['dot-matrix', 'digit-display', 'oled', 'fan-iic'],
            'aiblocksboard'
        );

        expect(manifest.blocks.map(block => block.opcode)).toEqual([
            'aiblocksboard_matrixLed_brightness',
            'aiblocksboard_matrixLed_show_num',
            'aiblocksboard_matrixLed_show_str',
            'aiblocksboard_matrixLed_pos_onoff',
            'aiblocksboard_matrix_led',
            'aiblocksboard_clear_matrix_led',
            'aiblocksboard_digit_show_num',
            'aiblocks_oled_init',
            'oled_draw_ascii',
            'oled_point',
            'oled_clear',
            'oled_draw_hline',
            'oled_draw_vline',
            'oled_draw_line',
            'oled_draw_rect',
            'aiblocks_fan_iic_set_module_speed'
        ]);
        expect(manifest.menus.aiblocks_iicport.items.map(item => item.value)).toEqual(['1', '2', '3', '4']);
        expect(manifest.menus.aimech_iicport).toBeUndefined();
    });

    test('generates the legacy RGB and point matrix calls', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
        const text = value => new TestBlock('text', {TEXT: value});
        const firstColumnOn = Array.from({length: 128}, (unused, index) => index % 16 === 0 ? '1' : '0').join('');
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('display_aimech_rgb_module_color_set', {PORT: '3'}, {
                RED: number(1), GREEN: number(2), BLUE: number(3)
            }),
            new TestBlock('display_aimech_rgb_module_color_select', {PORT: '3'}, {
                COLOR: new TestBlock('colour_picker', {COLOUR: '#ff9966'})
            }),
            new TestBlock('display_aimech_rgb_module_breath_one', {PORT: '3', COLOR: '4'}, {
                CYCLE: number(2)
            }),
            new TestBlock('display_aimech_rgb_module_breath', {PORT: '3'}),
            new TestBlock('display_aimech_rgb_module_close', {PORT: '3'}),
            new TestBlock('display_aimech_matrixLed_brightness', {PORT: '1'}, {BRIGHT: number(8)}),
            new TestBlock('display_aimech_matrixLed_show_num', {PORT: '1'}, {DATA: number(123)}),
            new TestBlock('display_aimech_matrixLed_show_str', {PORT: '1', SCROLL: 'True'}, {
                XPOS: number(2), YPOS: number(3), STR: text('Hi')
            }),
            new TestBlock('display_aimech_matrixLed_pos_onoff', {PORT: '1', LEDSTATUS: '1'}, {
                XPOS: number(4), YPOS: number(5)
            }),
            new TestBlock('display_aimech_matrix_led', {PORT: '1'}, {
                MATRIX: new TestBlock('led_matrix', {LEDMATRIX: firstColumnOn})
            }),
            new TestBlock('display_aimech_clear_matrix_led', {PORT: '1'}),
            new TestBlock('display_aimech_digit_show_num', {PORT: '2'}, {NUM: number(42)}),
            new TestBlock('display_aimech_oled_init', {PORT: '3'}),
            new TestBlock('display_oled_draw_ascii', {YPOS: '3'}, {XPOS: number(2), STR: text('Hi')}),
            new TestBlock('display_oled_point', {STATUS: '1'}, {XPOS: number(3), YPOS: number(4)}),
            new TestBlock('display_oled_clear'),
            new TestBlock('display_oled_draw_hline', {}, {XPOS: number(5), YPOS: number(6), LENGTH: number(7)}),
            new TestBlock('display_oled_draw_vline', {}, {XPOS: number(8), YPOS: number(9), LENGTH: number(10)}),
            new TestBlock('display_oled_draw_line', {}, {
                XPOS: number(1), YPOS: number(2), XPOS1: number(3), YPOS1: number(4)
            }),
            new TestBlock('display_oled_draw_rect', {SHAPE: '0'}, {
                XPOS: number(10), YPOS: number(11), XPOS1: number(12), YPOS1: number(13)
            }),
            new TestBlock('display_mp3_init', {IICPORT: '4'}),
            new TestBlock('display_mp3_play_song_num', {}, {VALUE: number(7)}),
            new TestBlock('display_mp3_play_control', {PLAYSTATUS: '3'}),
            new TestBlock('display_mp3_play_mode', {PLAYMODE: '0'}),
            new TestBlock('display_mp3_set_volume', {}, {VALUE: number(20)}),
            new TestBlock('display_rgb_color_set', {PORT: '8', NUMS: '15'}, {
                RED: number(1), GREEN: number(2), BLUE: number(3)
            }),
            new TestBlock('display_led_color_select', {PORT: '8', NUMS: '2'}, {
                COLOR: new TestBlock('colour_picker', {COLOUR: '#ff9966'})
            }),
            new TestBlock('display_led_close', {PORT: '8', NUMS: '15'}),
            new TestBlock('display_fan_module_speed', {PORT: '6'}, {SPEED: number(80)})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'rgbModule_3 = Hiwonder_DEV.DEV_RGB(Hiwonder_DEV.Port(3))',
            'rgbModule_3.set_rgb(1,2,3)',
            'rgbModule_3.set_rgb(0xff,0x99,0x66)',
            'rgbModule_3.set_Breathing(4,2)',
            'rgbModule_3.setRGBBreathingValue(5,10,15,40)',
            'rgbModule_3.set_rgb(0, 0, 0)',
            'ledMatrix_1 = Hiwonder_DEV.DEV_LEDMatrix(Hiwonder_DEV.Port(1))',
            'ledMatrix_1.setBrightness(8)',
            'ledMatrix_1.showNum(123)',
            'ledMatrix_1.drawStr(2,3,"Hi",True)',
            'ledMatrix_1.setLedOnOff(4,5,1)',
            `ledMatrix_1.drawBitMap((${['0xff', ...Array(15).fill('0x0')].join(',')}))`,
            'ledMatrix_1.clear()',
            'digit_2 = Hiwonder_DEV.DEV_NixieTube(Hiwonder_DEV.Port(2))',
            'digit_2.show_int(42)',
            'my_oled = Hiwonder_DEV.DEV_OLED(Hiwonder_DEV.Port(3))',
            'my_oled.text("Hi",2,3*10 )',
            'my_oled.pixel(3,4,1)',
            'my_oled.fill()',
            'my_oled.hline(5,6,7)',
            'my_oled.vline(8,9,10)',
            'my_oled.line(1,2,3,4)',
            'my_oled.rect(10,11,12,13)',
            'mp3 = Hiwonder.MP3(Hiwonder.Port(4))',
            'mp3.play(7)',
            'mp3.next()',
            'mp3.loop_on()',
            'mp3.volume(20)',
            'myrgb_8 = Hiwonder.Neopixel(Hiwonder.Port(8),15)',
            'myrgb_8.fill(1,2,3)',
            'myrgb_8.setItem(2,0xff,0x99,0x66)',
            'myrgb_8.write()',
            'myrgb_8.clear()',
            'fan_6 = Hiwonder_Fan.Fan(Hiwonder.Port(6))',
            'fan_6.set_speed(80)'
        ].forEach(line => expect(code).toContain(line));
        expect(code).not.toContain('int("#');
        expect(code.match(/rgbModule_3 = Hiwonder_DEV\.DEV_RGB/g)).toHaveLength(1);
        expect(code.match(/ledMatrix_1 = Hiwonder_DEV\.DEV_LEDMatrix/g)).toHaveLength(1);
        expect(code.match(/myrgb_8 = Hiwonder\.Neopixel/g)).toHaveLength(1);
        expect(code.match(/^import Hiwonder_DEV$/gm)).toHaveLength(1);
        expect(code.match(/^import Hiwonder_Fan$/gm)).toHaveLength(1);
    });

    test('generates the old AIBlocksBoard IIC output calls', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
        const text = value => new TestBlock('text', {TEXT: value});
        const firstColumnOn = Array.from({length: 128}, (unused, index) => index % 16 === 0 ? '1' : '0').join('');
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('display_aiblocksboard_matrixLed_brightness', {PORT: '2'}, {BRIGHT: number(6)}),
            new TestBlock('display_aiblocksboard_matrixLed_show_num', {PORT: '2'}, {DATA: number(42)}),
            new TestBlock('display_aiblocksboard_matrixLed_show_str', {PORT: '2', SCROLL: 'False'}, {
                XPOS: number(1), YPOS: number(2), STR: text('OK')
            }),
            new TestBlock('display_aiblocksboard_matrixLed_pos_onoff', {PORT: '2', LEDSTATUS: '1'}, {
                XPOS: number(3), YPOS: number(4)
            }),
            new TestBlock('display_aiblocksboard_matrix_led', {PORT: '2'}, {
                MATRIX: new TestBlock('led_matrix', {LEDMATRIX: firstColumnOn})
            }),
            new TestBlock('display_aiblocksboard_clear_matrix_led', {PORT: '2'}),
            new TestBlock('display_aiblocksboard_digit_show_num', {PORT: '3'}, {NUM: number(12)}),
            new TestBlock('display_aiblocks_oled_init', {PORT: '4'}),
            new TestBlock('display_oled_clear'),
            new TestBlock('display_aiblocks_fan_iic_set_module_speed', {PORT: '1'}, {SPEED: number(55)})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'iic = Hiwonder_IIC.IIC()',
            'matrix_2 = Hiwonder_IIC.DEV_LEDMatrix(iic,2)',
            'matrix_2.setBrightness(6)',
            'matrix_2.showNum(42)',
            'matrix_2.drawStr(1,2,"OK",False)',
            'matrix_2.setLedOnOff(3,4,1)',
            `matrix_2.drawBitMap((${['0xff', ...Array(15).fill('0x0')].join(',')}))`,
            'matrix_2.clear()',
            'digit_3 = Hiwonder_IIC.DEV_NixieTube(iic,3)',
            'digit_3.show_int(12)',
            'my_oled = Hiwonder_IIC.DEV_OLED(iic,4)',
            'my_oled.fill()',
            'iic_fan_1 = Hiwonder_IIC.DEV_FAN(iic,1,0x58)',
            'iic_fan_1.set_speed(55)'
        ].forEach(line => expect(code).toContain(line));
        expect(code.match(/^import Hiwonder_IIC$/gm)).toHaveLength(1);
        expect(code.match(/iic = Hiwonder_IIC\.IIC\(\)/g)).toHaveLength(1);
        expect(code.match(/matrix_2 = Hiwonder_IIC\.DEV_LEDMatrix/g)).toHaveLength(1);
    });
});
