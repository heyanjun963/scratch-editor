import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {isProductModuleSupported} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'ps3_init',
    'ps3_get_address',
    'ps3_disconnect',
    'ps3_is_connected',
    'ps3_set_led',
    'ps3_set_rumble',
    'ps3_get_keys',
    'ps3_get_axis',
    'ps3_get_sensor'
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

// 产品主程序与共享通信模块共同查询模板，覆盖真实组合后的 Python 生成流程。
const getTemplate = blockType => {
    for (const extensionId of ['aihexa', 'communication']) {
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

describe('communication built-in Mind+ snapshot', () => {
    test('keeps the complete legacy PS3 category and Chinese labels', () => {
        const manifest = builtinProductManifests.communication;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'communication',
            name: '通信模块',
            version: '1.0.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.categories.map(category => category.name)).toEqual(['PS3手柄']);
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(manifest.blocks.map(block => block.text)).toEqual([
            '初始化手柄，MAC地址 [STR]',
            '获取mac地址',
            '断开连接',
            '是否连接成功？',
            '设置LED灯1 [VALUE1] 灯2 [VALUE2] 灯3 [VALUE3] 灯4 [VALUE4]',
            '设置手柄震动强度 [VALUE1] 和震动时间(最大值5000ms) [VALUE2] ms',
            '[PS3_KEYS] 被按下',
            '获取 [HANDLE_AXIS] 值',
            '获取imu [ACCEL] 值'
        ]);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(['PS3手柄']);
    });

    test('keeps legacy PS3 menus, argument types and defaults', () => {
        const manifest = builtinProductManifests.communication;
        const block = opcode => manifest.blocks.find(candidate => candidate.opcode === opcode);

        expect(manifest.menus.ps3_keys.items).toEqual([
            {text: 'SELECT', value: 'SELECT'}, {text: 'START', value: 'START'}, {text: 'PS', value: 'PS'},
            {text: '↑', value: 'UP'}, {text: '↓', value: 'DOWN'}, {text: '←', value: 'LEFT'},
            {text: '→', value: 'RIGHT'}, {text: 'L1', value: 'L1'}, {text: 'L2', value: 'L2'},
            {text: 'L3', value: 'L3'}, {text: 'R1', value: 'R1'}, {text: 'R2', value: 'R2'},
            {text: 'R3', value: 'R3'}, {text: '◭', value: 'TRIANGLE'}, {text: '◯', value: 'CIRCLE'},
            {text: '╳', value: 'CROSS'}, {text: '▢', value: 'SQUARE'}
        ]);
        expect(manifest.menus.ps3_handle_axis.items).toEqual([
            {text: '右舵水平', value: 'RX'}, {text: '右舵垂直', value: 'RY'},
            {text: '左舵水平', value: 'LX'}, {text: '左舵垂直', value: 'LY'}
        ]);
        expect(manifest.menus.accel.items).toEqual([
            {text: 'X轴角度', value: 'ACCEL_X'}, {text: 'Y轴角度', value: 'ACCEL_Y'}
        ]);
        expect(manifest.menus.on_off.items).toEqual([
            {text: '开', value: '1'}, {text: '关', value: '0'}
        ]);
        expect(block('ps3_init').arguments.STR).toMatchObject({type: 'string', defaultValue: '10:00:00:00:00:00'});
        expect(block('ps3_set_rumble').arguments).toMatchObject({
            VALUE1: {type: 'number', defaultValue: 60},
            VALUE2: {type: 'number', defaultValue: 3000}
        });
        expect(block('ps3_set_led').arguments.VALUE1)
            .toMatchObject({type: 'string', defaultValue: '1', menu: 'on_off', literal: true});
        expect(block('ps3_is_connected')).toMatchObject({blockType: 'boolean', disableMonitor: true});
    });

    test('keeps the old product support boundary', () => {
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa', 'aidoggy']
            .forEach(productId => expect(
                isProductModuleSupported(productId, 'communication', 'communication')
            ).toBe(true));
        expect(isProductModuleSupported('minihexa', 'communication', 'communication')).toBe(false);
    });

    test('generates all nine legacy PS3 calls', () => {
        const number = value => new TestBlock('math_number', {NUM: value});
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('communication_ps3_init', {}, {
                STR: new TestBlock('text', {TEXT: '10:20:30:40:50:60'})
            }),
            new TestBlock('communication_ps3_get_address'),
            new TestBlock('communication_ps3_disconnect'),
            new TestBlock('communication_ps3_is_connected'),
            new TestBlock('communication_ps3_set_led', {VALUE1: '1', VALUE2: '0', VALUE3: '1', VALUE4: '0'}),
            new TestBlock('communication_ps3_set_rumble', {}, {VALUE1: number(80), VALUE2: number(2500)}),
            new TestBlock('communication_ps3_get_keys', {PS3_KEYS: 'TRIANGLE'}),
            new TestBlock('communication_ps3_get_axis', {HANDLE_AXIS: 'LX'}),
            new TestBlock('communication_ps3_get_sensor', {ACCEL: 'ACCEL_Y'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'import PS3',
            'PS3.init("10:20:30:40:50:60")',
            'PS3.get_address()',
            'PS3.deinit()',
            'PS3.isconnected()',
            'PS3.setleds([1,0,1,0])',
            'PS3.set_rumble(80, 2500)',
            'PS3.get_button(PS3.TRIANGLE)',
            'PS3.get_axis(PS3.LX)',
            'PS3.get_sensor(PS3.ACCEL_Y)'
        ].forEach(line => expect(code).toContain(line));
        expect(code.match(/^import PS3$/gm)).toHaveLength(1);
    });
});
