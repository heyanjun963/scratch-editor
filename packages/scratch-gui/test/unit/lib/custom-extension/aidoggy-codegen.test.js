import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';

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

// 测试直接读取内置 manifest，保证 AiDoggy 包注册后参与 VM Python 代码生成。
const getAiDoggyTemplate = blockType => {
    const manifest = builtinProductManifests.aidoggy;
    if (!manifest || !blockType.startsWith(`${manifest.id}_`)) return null;
    const opcode = blockType.slice(manifest.id.length + 1);
    const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

describe('AiDoggy Python generator', () => {
    test('matches legacy main and start-run final output', () => {
        const main = new TestBlock('aidoggy_start_thread');
        const buzzer = new TestBlock('aidoggy_buzzer_tone_set', {
            TONES: '65',
            RHYTHMS: '500',
            VALUE: 100,
            VALUE2: 1
        });
        const alarm = new TestBlock('aidoggy_set_low_battery_alarm', {VALUE: 'True'});
        const startRun = new TestBlock('aidoggy_start_run_thread');
        const print = new TestBlock('aidoggy_print_str', {STR: 'Hello'});
        main.next = buzzer;
        buzzer.next = alarm;
        startRun.next = print;

        const code = generatePythonCode(createWorkspace([main, startRun]), {
            getPythonCodegenTemplate: getAiDoggyTemplate
        });

        expect(code).toBe([
            'import Hiwonder',
            'import time',
            '',
            '# initialize variables',
            'aidoggy = Hiwonder.AIDoggy()',
            'beep = Hiwonder.Buzzer()',
            'rsys = Hiwonder.Robot_System()',
            '',
            'print("Hello")',
            'time.sleep(0.05)',
            '',
            'def start_main():',
            '    global beep',
            '    global rsys',
            '    beep.set_buzzer(65,500,100,1)',
            '    rsys.set_low_voltage_alarm_enable(True)',
            '',
            'Hiwonder.startMain(start_main)'
        ].join('\n'));
    });

    test('updates movement and turn output when dropdown values change', () => {
        const main = new TestBlock('aidoggy_start_thread');
        const move = new TestBlock('aidoggy_set_move', {
            VALUE1: '0',
            VALUE2: 200,
            VALUE3: 40,
            VALUE4: 30,
            VALUE5: 80
        });
        const turn = new TestBlock('aidoggy_set_turn', {VALUE1: 12, VALUE2: '1'});
        main.next = move;
        move.next = turn;

        const generate = () => generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getAiDoggyTemplate
        });

        expect(generate()).toContain('aidoggy.move(0,200,40,30,80)');
        expect(generate()).toContain('aidoggy.omni_move(0,0,12,0,0)');
        move.fields.VALUE1 = '-90';
        turn.fields.VALUE2 = '-1';
        expect(generate()).toContain('aidoggy.move(-90,200,40,30,80)');
        expect(generate()).toContain('aidoggy.omni_move(0,0,-12,0,0)');
    });

    test('generates pose, omni motion, gait and stop commands', () => {
        const main = new TestBlock('aidoggy_start_thread');
        const pose = new TestBlock('aidoggy_set_pose', {
            VALUE1: 1,
            VALUE2: 2,
            VALUE3: 3,
            VALUE4: 4,
            VALUE5: 5,
            VALUE6: 1000
        });
        const move = new TestBlock('aidoggy_set_move_xyz', {
            VALUE1: 10,
            VALUE2: 20,
            VALUE3: 30,
            VALUE4: 40,
            VALUE5: 50
        });
        const gait = new TestBlock('aidoggy_set_gait', {VALUE1: '3'});
        const stop = new TestBlock('aidoggy_set_stop');
        main.next = pose;
        pose.next = move;
        move.next = gait;
        gait.next = stop;

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getAiDoggyTemplate
        });

        expect(code).toContain('aidoggy.set_pose(1,2,3,4,5,1000)');
        expect(code).toContain('aidoggy.omni_move(10,20,30,40,50)');
        expect(code).toContain('aidoggy.set_gait(3)');
        expect(code).toContain('aidoggy.stop()');
    });

    test('generates legacy action group and battery reporter output', () => {
        const main = new TestBlock('aidoggy_start_thread');
        const customActionName = new TestBlock('text', {TEXT: 'sit_preset'});
        const customAction = new TestBlock('aidoggy_run_action', {BLOCK: 'True'}, {ACTION: customActionName});
        const presetAction = new TestBlock('aidoggy_run_action_name', {
            ACTION: 'waveHand_preset',
            BLOCK: 'False'
        });
        const battery = new TestBlock('aidoggy_get_battery_level');
        const print = new TestBlock('aidoggy_print_number', {}, {NUM: battery});
        const stop = new TestBlock('aidoggy_stop_action');
        main.next = customAction;
        customAction.next = presetAction;
        presetAction.next = print;
        print.next = stop;

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getAiDoggyTemplate
        });

        expect(code).toContain('aidoggy.run_action_group("sit_preset",True)');
        expect(code).toContain("aidoggy.run_action_group('waveHand_preset',False)");
        expect(code).toContain('print(rsys.read_battery_voltage())');
        expect(code).toContain('time.sleep(0.05)');
        expect(code).toContain('aidoggy.action_stop()');
    });
});
