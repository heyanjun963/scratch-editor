import fs from 'fs';
import path from 'path';

import JSZip from 'jszip';

import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';
import {
    getPythonCodegenTemplate,
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../../../../src/lib/custom-extension/codegen-registry';
import {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
} from '../../../../src/lib/custom-extension/manifest-schema';
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

const createMindPlusPackage = async ({config, main, menus, locales = {}, icon}) => {
    const zip = new JSZip();
    zip.file('config.json', JSON.stringify(config));
    if (main) zip.file('python/main.ts', main);
    if (menus) zip.file('python/_menus/index.json', JSON.stringify(menus));
    if (icon) zip.file('python/_images/icon.svg', icon);
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
            name: 'AiDoggy',
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
            'aidoggy.omni_move(0,0,{VALUE1},0,0)'
        );
        expect(blocksByOpcode.set_turn.codegen.python.templateSelector).toEqual({
            argument: 'VALUE2',
            cases: {
                '1': 'aidoggy.omni_move(0,0,{VALUE1},0,0)',
                '-1': 'aidoggy.omni_move(0,0,-{VALUE1},0,0)'
            }
        });
        expect(blocksByOpcode.get_battery_level.text).toBe('电池电压(mV)');
        expect(blocksByOpcode.run_action.arguments.BLOCK.type).toBe('number');
        expect(blocksByOpcode.run_action_name.arguments.BLOCK.type).toBe('number');
        expect(manifest.menus.orientation.items.map(item => item.value)).toEqual([
            '0', '180', '90', '-90', '45', '-45', '75', '-75'
        ]);

        const main = new TestBlock('aidoggy_start_thread');
        main.next = new TestBlock('aidoggy_set_turn', {VALUE1: 12, VALUE2: '-1'});
        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getManifestTemplate(manifest)
        });
        expect(code).toContain('aidoggy = Hiwonder.AIDoggy()');
        expect(code).toContain('aidoggy.omni_move(0,0,-12,0,0)');
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

    test('converts addVariableForce into named variable override metadata', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'forcevariable',
                name: {'zh-cn': '变量覆盖测试'},
                version: '1.0.0',
                scratchEditor: {
                    blocks: {start_thread: {section: 'main'}}
                },
                asset: {python: {dir: 'python', main: 'main.ts', version: '1.0.0'}}
            },
            main: `
                //% color="#4682b4"
                namespace forcevariable {
                    //% block="主程序" blockType="hat"
                    export function start_thread(parameter: any, block: any) {
                        Generator.addImport("import Hiwonder");
                    }

                    //% block="初始化 IMU" blockType="command"
                    export function imu_init(parameter: any, block: any) {
                        Generator.addObject("", "", "imu = Hiwonder.IMU()");
                    }

                    //% block="校准 IMU" blockType="command"
                    export function imu_cali(parameter: any, block: any) {
                        Generator.addObject("", "", "buttonA = Hiwonder.Button('A')");
                        Generator.addVariableForce("imu", "imu = Hiwonder.IMU(True, is_stop)");
                    }
                }
            `
        });

        const manifest = await readCustomExtensionPackageBuffer(packageData, 'forcevariable.mpext');
        const blocksByOpcode = Object.fromEntries(manifest.blocks.map(block => [block.opcode, block]));

        expect(blocksByOpcode.imu_cali.codegen.python.forcedVariables).toEqual([{
            name: 'imu',
            code: 'imu = Hiwonder.IMU(True, is_stop)'
        }]);

        const restoredManifest = normalizeCustomExtensionManifest(serializeCustomExtensionManifest(manifest));
        registerPythonCodegenManifest(restoredManifest);
        expect(getPythonCodegenTemplate('forcevariable_imu_cali').forcedVariables).toEqual([{
            name: 'imu',
            code: 'imu = Hiwonder.IMU(True, is_stop)'
        }]);
        unregisterPythonCodegenManifest(restoredManifest);

        const main = new TestBlock('forcevariable_start_thread');
        main.next = new TestBlock('forcevariable_imu_init');
        main.next.next = new TestBlock('forcevariable_imu_cali');
        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getManifestTemplate(manifest)
        });
        expect(code).not.toContain('imu = Hiwonder.IMU()');
        expect(code).toContain('imu = Hiwonder.IMU(True, is_stop)');
    });

    test('uses the Python asset version and merges locale fallbacks', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'localefixture',
                name: {en: 'Locale fixture'},
                scratchEditor: {
                    blocks: {
                        read: {
                            templateSelector: {
                                argument: 'MODE',
                                cases: {
                                    fast: 'read_fast()',
                                    stable: 'read_stable()'
                                }
                            }
                        }
                    }
                },
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
                MODE: {menu: [['Fast', 'fast'], ['Stable', 'stable']]}
            },
            locales: {
                en: {
                    'localefixture.read|block': 'read mode [MODE]',
                    'localefixture.MODE.fast|menu': 'Fast fallback'
                },
                'zh-cn': {
                    'localefixture.read|block': '读取模式 [MODE]'
                }
            },
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>'
        });

        const manifest = await readCustomExtensionPackageBuffer(packageData, 'locale.mpext');

        expect(manifest.version).toBe('2.3.4');
        expect(manifest.icon).toMatch(/^data:image\/svg\+xml;utf8,/);
        expect(manifest.blocks[0].text).toBe('读取模式 [MODE]');
        expect(manifest.blocks[0].disableMonitor).toBe(true);
        expect(manifest.blocks[0].codegen.python.templateSelector).toEqual({
            argument: 'MODE',
            cases: {
                fast: 'read_fast()',
                stable: 'read_stable()'
            }
        });
        expect(manifest.menus.MODE.items).toEqual([
            {text: 'Fast fallback', value: 'fast'},
            {text: 'Stable', value: 'stable'}
        ]);
    });

    test('preserves Scratch-specific colors and line mask arguments declared by a Mind+ product', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'linefixture',
                name: {en: 'Line fixture'},
                version: '1.0.0',
                scratchEditor: {
                    color1: '#1874cd',
                    color2: '#145fa8',
                    color3: '#104b85',
                    blocks: {
                        read6: {
                            arguments: {
                                LINE: {
                                    type: 'line6',
                                    defaultValue: '00'
                                }
                            }
                        },
                        read4: {
                            arguments: {
                                LINE: {
                                    type: 'line4',
                                    defaultValue: '00'
                                }
                            }
                        }
                    }
                },
                asset: {
                    python: {
                        dir: 'python/',
                        main: 'main.ts'
                    }
                }
            },
            main: [
                '//% color="#1874cd"',
                'namespace linefixture {',
                '    //% block="read six [LINE]" blockType="boolean"',
                '    //% LINE.shadow="string" LINE.defl="00"',
                '    export function read6(parameter: any, block: any) {',
                '        const line = parameter.LINE.code;',
                '        Generator.addCode(`read_line(${line})`);',
                '    }',
                '    //% block="read four [LINE]" blockType="boolean"',
                '    //% LINE.shadow="string" LINE.defl="00"',
                '    export function read4(parameter: any, block: any) {',
                '        const line = parameter.LINE.code;',
                '        Generator.addCode(`read_line(${line})`);',
                '    }',
                '}'
            ].join('\n')
        });

        const manifest = await readCustomExtensionPackageBuffer(packageData, 'linefixture.mpext');

        expect(manifest).toMatchObject({
            color1: '#1874cd',
            color2: '#145fa8',
            color3: '#104b85'
        });
        expect(manifest.blocks[0].disableMonitor).toBe(true);
        expect(manifest.blocks[0].arguments.LINE).toMatchObject({
            type: 'line6',
            scratchType: 'line6',
            defaultValue: '00',
            literal: false
        });
        expect(manifest.blocks[1].arguments.LINE).toMatchObject({
            type: 'line4',
            scratchType: 'line4',
            defaultValue: '00',
            literal: false
        });
    });

    test('preserves a Mind+ color picker argument and its RGB channel formatter', async () => {
        const packageData = await createMindPlusPackage({
            config: {
                id: 'colorfixture',
                name: {en: 'Color fixture'},
                version: '1.0.0',
                asset: {
                    python: {dir: 'python/', main: 'main.ts'}
                }
            },
            main: [
                '//% color="#123456"',
                'namespace colorfixture {',
                '    //% block="set color [COLOR]" blockType="command"',
                '    //% COLOR.shadow="color" COLOR.defl="#ff8040"',
                '    export function set_color(parameter: any, block: any) {',
                '        Generator.addCode(`set_rgb({COLOR.rgb})`);',
                '    }',
                '    //% block="set legacy color [COLOR]" blockType="command"',
                '    //% COLOR.shadow="string" COLOR.defl="#ff9966"',
                '    export function set_legacy_color(parameter: any, block: any) {',
                '        const color = parameter.COLOR.code;',
                '        Generator.addCode(`set_rgb(int(${color}[1:3],16),int(${color}[3:5],16),' +
                    'int(${color}[5:7],16))`);',
                '    }',
                '}'
            ].join('\n')
        });

        const manifest = await readCustomExtensionPackageBuffer(packageData, 'colorfixture.mpext');

        expect(manifest.blocks[0].arguments.COLOR).toMatchObject({
            type: 'color',
            scratchType: 'color',
            defaultValue: '#ff8040',
            literal: false
        });
        expect(manifest.blocks[0].codegen.python.template).toBe('set_rgb({COLOR.rgb})');
        expect(manifest.blocks[1].arguments.COLOR).toMatchObject({
            type: 'color',
            scratchType: 'color',
            defaultValue: '#ff9966',
            literal: false
        });
        expect(manifest.blocks[1].codegen.python.template).toBe('set_rgb({COLOR.rgb})');
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
