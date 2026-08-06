import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';

const RGB_CASES = [
    ['aimecanum', 'set_led_color', {}, 'rgb.setRGB(0,0xff,0x99,0x66)'],
    ['aiquadruped', 'set_led_color', {}, 'rgb.setRGB(0,0xff,0x99,0x66)'],
    ['aiquadrupedpro', 'set_led_color', {}, 'rgb.setRGB(0,0xff,0x99,0x66)'],
    ['aihexa', 'set_led_color', {}, 'rgb.setRGB(0,0xff,0x99,0x66)'],
    [
        'aimecanum',
        'set_led_ultrasonic_color',
        {NUMS: '2'},
        'mecanumCar.sonar.setRGB(2,0xff,0x99,0x66)'
    ]
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
    const manifest = Object.values(builtinProductManifests)
        .find(candidate => blockType.startsWith(`${candidate.id}_`));
    if (!manifest) return null;
    const block = manifest.blocks.find(candidate => (
        `${manifest.id}_${candidate.opcode}` === blockType
    ));
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

// 所有内置 RGB 颜色积木都应在生成阶段展开十六进制通道，避免真机运行时再解析颜色字符串。
describe('built-in RGB color code generation', () => {
    test.each(RGB_CASES)('%s %s preserves the legacy hexadecimal channel output',
        (productId, opcode, fields, expectedCode) => {
            const manifest = builtinProductManifests[productId];
            const manifestBlock = manifest.blocks.find(block => block.opcode === opcode);
            const colorArgument = manifestBlock.arguments.COLOR;
            const main = new TestBlock(`${productId}_start_thread`);
            const color = new TestBlock(`${productId}_${opcode}`, fields, {
                COLOR: new TestBlock('colour_picker', {COLOUR: '#ff9966'})
            });
            main.next = color;

            expect(colorArgument).toMatchObject({
                type: 'color',
                scratchType: 'color'
            });
            expect(manifestBlock.codegen.python.template).toContain('{COLOR.rgb}');

            const code = generatePythonCode(createWorkspace([main]), {
                getPythonCodegenTemplate: getTemplate
            });
            expect(code).toContain(expectedCode);
            expect(code).not.toContain('int(');
        });
});
