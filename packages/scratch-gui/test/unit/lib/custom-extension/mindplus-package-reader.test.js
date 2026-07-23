import fs from 'fs';
import path from 'path';

import JSZip from 'jszip';

import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';
import {readCustomExtensionPackageBuffer} from '../../../../src/lib/custom-extension/package-reader';

const EXPECTED_AIDOGGY_OPCODES = [
    'start_thread',
    'start_run_thread',
    'buzzer_tone_set',
    'buzzer_tone_set_arg',
    'get_battery_level',
    'set_low_battery_alarm',
    'print_str',
    'print_number',
    'set_pose',
    'set_move',
    'set_move_xyz',
    'set_turn',
    'set_gait',
    'set_stop',
    'run_action',
    'run_action_name',
    'stop_action'
];

const createMindPlusPackage = async ({config, main, menus, locales = {}}) => {
    const zip = new JSZip();
    zip.file('config.json', JSON.stringify(config));
    if (main) zip.file('python/main.ts', main);
    if (menus) zip.file('python/_menus/index.json', JSON.stringify(menus));
    Object.entries(locales).forEach(([locale, messages]) => {
        zip.file(`python/_locales/${locale}.json`, JSON.stringify(messages));
    });
    return zip.generateAsync({type: 'nodebuffer'});
};

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

const getManifestTemplate = manifest => blockType => {
    if (!blockType.startsWith(`${manifest.id}_`)) return null;
    const opcode = blockType.slice(manifest.id.length + 1);
    const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

// Mind+ 包只能通过静态转换进入现有 manifest，测试禁止执行 fixture 中的 TypeScript。
describe('Mind+ package reader', () => {
    const guiRoot = path.resolve(__dirname, '../../../..');
    const fixtureRoot = path.join(guiRoot, 'test/fixtures/custom-extension/mindplus');

    test('converts the AiDoggy MPEXT into the current manifest contract', async () => {
        const packageFile = path.join(fixtureRoot, 'dist/aidoggy-python-fixture-0.1.0.mpext');
        const manifest = await readCustomExtensionPackageBuffer(fs.readFileSync(packageFile), 'aidoggy.mpext');
        const blocksByOpcode = Object.fromEntries(manifest.blocks.map(block => [block.opcode, block]));

        expect(manifest).toMatchObject({
            id: 'aidoggy',
            name: 'AiDoggy兼容测试',
            version: '0.1.0',
            source: 'mindplus',
            package: {
                fileName: 'aidoggy.mpext',
                structure: 'mindplus-python-package-v1'
            }
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_AIDOGGY_OPCODES);
        expect(manifest.categories.map(category => category.name)).toEqual([
            'entry', '板载资源', '输出打印', '运动控制', '动作组控制'
        ]);
        expect(Object.keys(manifest.menus)).toEqual([
            'action_name', 'blocking', 'oriention_turn', 'orientation', 'gait', 'tones', 'rhythms', 'on_off'
        ]);
        expect(blocksByOpcode.start_thread.codegen.python).toMatchObject({
            template: '',
            imports: ['import Hiwonder'],
            variables: ['aidoggy = Hiwonder.AIDoggy()'],
            launcher: 'Hiwonder.startMain({MAIN})',
            section: 'main'
        });
        expect(blocksByOpcode.start_run_thread.codegen.python.section).toBe('setup');
        expect(blocksByOpcode.buzzer_tone_set.codegen.python).toMatchObject({
            template: 'beep.set_buzzer({TONES},{RHYTHMS},{VALUE},{VALUE2})',
            variables: ['beep = Hiwonder.Buzzer()']
        });
        expect(blocksByOpcode.set_turn.codegen.python.template).toBe(
            'aidoggy.omni_move(0,0,({VALUE1})*({VALUE2}),0,0)'
        );
        expect(blocksByOpcode.get_battery_level.text).toBe('电池电压(mV)');
        expect(manifest.menus.orientation.items.map(item => item.value)).toEqual([
            '0', '180', '90', '-90', '45', '-45', '75', '-75'
        ]);

        const main = new TestBlock('aidoggy_start_thread');
        main.next = new TestBlock('aidoggy_set_turn', {VALUE1: 12, VALUE2: '-1'});
        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getManifestTemplate(manifest)
        });
        expect(code).toContain('aidoggy = Hiwonder.AIDoggy()');
        expect(code).toContain('aidoggy.omni_move(0,0,(12)*(-1),0,0)');
        expect(code).toContain('Hiwonder.startMain(start_main)');
    });

    test('converts Python imports, templates and local runtime libraries', async () => {
        const packageFile = path.join(fixtureRoot, 'dist/python-basic-fixture-0.1.0.mpext');
        const manifest = await readCustomExtensionPackageBuffer(
            fs.readFileSync(packageFile),
            'python-basic-fixture.mpext'
        );
        const blocksByOpcode = Object.fromEntries(manifest.blocks.map(block => [block.opcode, block]));

        expect(manifest).toMatchObject({
            id: 'pythonfixture',
            name: 'Python兼容测试',
            runtime: {
                pythonLibraries: ['python/libraries/fixture_helper.py'],
                pythonDependencies: {'typing-extensions': '4.12.2'}
            }
        });
        expect(manifest.runtime.files).toEqual([{
            path: 'python/libraries/fixture_helper.py',
            content: expect.stringContaining('def read_status(mode):')
        }]);
        expect(blocksByOpcode.printText.codegen.python).toMatchObject({
            imports: ['import time'],
            template: 'for _ in range({COUNT}):\n\tprint({TEXT})\n\ttime.sleep(0.05)'
        });
        expect(blocksByOpcode.readStatus.codegen.python).toMatchObject({
            imports: ['from fixture_helper import read_status'],
            template: 'read_status({MODE})'
        });
        expect(manifest.menus.MODE.items).toEqual([
            {text: '快速', value: 'fast'},
            {text: '稳定', value: 'stable'}
        ]);
    });

    test('uses the Python asset version and merges locale fallbacks', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'localefixture',
                name: {en: 'Locale fixture'},
                asset: {
                    python: {
                        dir: 'python/',
                        version: '2.3.4',
                        main: 'main.ts'
                    }
                }
            },
            main: [
                '//% color="#123456"',
                'namespace localefixture {',
                '    //% block="read [MODE]" blockType="reporter"',
                '    //% MODE.shadow="dropdown" MODE.options="MODE"',
                '    export function read(parameter: any, block: any) {',
                '        const mode = parameter.MODE.code;',
                '        Generator.addCode(`${mode}`);',
                '    }',
                '}'
            ].join('\n'),
            menus: {
                MODE: {menu: [['Fast', 'fast']]}
            },
            locales: {
                en: {
                    'localefixture.read|block': 'read mode [MODE]',
                    'localefixture.MODE.fast|menu': 'Fast fallback'
                },
                'zh-cn': {
                    'localefixture.read|block': '读取模式 [MODE]'
                }
            }
        });

        const manifest = await readCustomExtensionPackageBuffer(packageData, 'locale.mpext');

        expect(manifest.version).toBe('2.3.4');
        expect(manifest.blocks[0].text).toBe('读取模式 [MODE]');
        expect(manifest.menus.MODE.items).toEqual([{text: 'Fast fallback', value: 'fast'}]);
    });

    test('rejects Arduino C assets with an explicit target error', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'arduinofixture',
                name: {en: 'Arduino fixture'},
                version: '0.1.0',
                asset: {
                    arduinoC: {dir: 'arduinoC/', main: 'main.ts'}
                }
            }
        });

        await expect(readCustomExtensionPackageBuffer(packageData, 'arduino.mpext'))
            .rejects.toThrow('Mind+ 包当前只支持 asset.python');
    });

    test('rejects non-whitelisted statements with opcode and line number', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'unsafeextension',
                name: {en: 'Unsafe extension'},
                version: '0.1.0',
                asset: {
                    python: {dir: 'python/', main: 'main.ts'}
                }
            },
            main: [
                '//% color="#123456"',
                'namespace unsafeextension {',
                '    //% block="unsafe" blockType="command"',
                '    export function unsafe_block(parameter: any, block: any) {',
                '        runUnknownCode();',
                '        Generator.addCode("pass");',
                '    }',
                '}'
            ].join('\n')
        });

        await expect(readCustomExtensionPackageBuffer(packageData, 'unsafe.mpext'))
            .rejects.toThrow(/积木 unsafe_block 第 5 行包含不支持的语句/);
    });

    test('requires explicit entry metadata for hat blocks', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'eventfixture',
                name: {en: 'Event fixture'},
                version: '0.1.0',
                asset: {
                    python: {dir: 'python/', main: 'main.ts'}
                }
            },
            main: [
                '//% color="#123456"',
                'namespace eventfixture {',
                '    //% block="when event" blockType="hat"',
                '    export function when_event(parameter: any, block: any) {',
                '        Generator.addCode("pass");',
                '    }',
                '}'
            ].join('\n')
        });

        await expect(readCustomExtensionPackageBuffer(packageData, 'event.mpext'))
            .rejects.toThrow('Mind+ 帽子积木 when_event 必须通过 scratchEditor.blocks 声明 section');
    });

    test('rejects asset paths that leave the package root', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'pathfixture',
                name: {en: 'Path fixture'},
                version: '0.1.0',
                asset: {
                    python: {dir: '../python/', main: 'main.ts'}
                }
            }
        });

        await expect(readCustomExtensionPackageBuffer(packageData, 'path.mpext'))
            .rejects.toThrow('Mind+ 包包含不安全路径: ../python/');
    });
});
