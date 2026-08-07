import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {isProductModuleSupported} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'aimech_rgb_module_color_set',
    'aimech_rgb_module_color_select',
    'aimech_rgb_module_breath_one',
    'aimech_rgb_module_breath',
    'aimech_rgb_module_close'
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
    test('keeps the complete RGB module category and menus', () => {
        const manifest = builtinProductManifests.display;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'display',
            name: '输出模块',
            version: '1.0.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.categories.map(category => category.name)).toEqual(['RGB模块']);
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(['RGB模块']);
        expect(manifest.menus.aimech_iicport.items).toHaveLength(7);
        expect(manifest.menus.light_colors.items).toEqual([
            {text: '红', value: '0'}, {text: '绿', value: '1'}, {text: '蓝', value: '2'},
            {text: '黄', value: '3'}, {text: '紫', value: '4'}, {text: '青', value: '5'},
            {text: '白', value: '6'}
        ]);
        expect(manifest.blocks.find(block => block.opcode === 'aimech_rgb_module_color_select')
            .arguments.COLOR).toMatchObject({type: 'color', defaultValue: '#ff0000'});
    });

    test('keeps the old product support boundary', () => {
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa']
            .forEach(productId => expect(isProductModuleSupported(productId, 'display', 'rgb-module')).toBe(true));
        expect(isProductModuleSupported('aidoggy', 'display', 'rgb-module')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'display', 'rgb-module')).toBe(false);
    });

    test('generates all five legacy RGB calls with hexadecimal color channels', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
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
            new TestBlock('display_aimech_rgb_module_close', {PORT: '3'})
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
            'rgbModule_3.set_rgb(0, 0, 0)'
        ].forEach(line => expect(code).toContain(line));
        expect(code).not.toContain('int(');
        expect(code.match(/rgbModule_3 = Hiwonder_DEV\.DEV_RGB/g)).toHaveLength(1);
        expect(code.match(/^import Hiwonder_DEV$/gm)).toHaveLength(1);
    });
});
