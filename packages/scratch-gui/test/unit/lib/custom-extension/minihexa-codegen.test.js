import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {
    getPythonCodegenTemplate,
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../../../../src/lib/custom-extension/codegen-registry';

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

// 测试直接读取内置 manifest，保证配置包注册后真正参与 VM Python 代码生成。
const getMiniHexaTemplate = blockType => {
    const manifest = builtinProductManifests.minihexa;
    if (!manifest || !blockType.startsWith(`${manifest.id}_`)) return null;
    const opcode = blockType.slice(manifest.id.length + 1);
    const block = manifest.blocks.find(candidate => candidate.opcode === opcode);
    return block ? {
        blockType: block.blockType,
        arguments: block.arguments,
        ...block.codegen.python
    } : null;
};

describe('miniHexa Python generator', () => {
    test('matches the legacy output for main, start-run, action, UART and buzzer blocks', () => {
        const main = new TestBlock('minihexa_start_thread');
        const actionNumber = new TestBlock('text', {TEXT: '1'});
        const action = new TestBlock('minihexa_action_run', {LOOP: 1}, {NUM: actionNumber});
        const baudrate = new TestBlock('minihexa_serial_set_baudrate', {DATA: '9600'});
        const startRun = new TestBlock('minihexa_start_run_thread');
        const buzzer = new TestBlock('minihexa_buzzer_tone_set', {
            TONES: '65',
            RHYTHMS: '500',
            MODE: 'False'
        });
        main.next = action;
        action.next = baudrate;
        startRun.next = buzzer;

        const code = generatePythonCode(createWorkspace([main, startRun]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toBe([
            'import Hiwonder',
            'import time',
            'import Hiwonder_DEV',
            '',
            '# initialize variables',
            'minihexa = Hiwonder.Robot()',
            'uart = Hiwonder.UART(9600)',
            'beep = Hiwonder.Buzzer()',
            '',
            'beep.playTone(65,500,False)',
            '',
            'def start_main():',
            '    global minihexa',
            '    minihexa.action_run("1",1)',
            '',
            'Hiwonder.startMain(start_main)'
        ].join('\n'));
    });

    test('generates legacy main launcher and direction-dependent robot commands', () => {
        const main = new TestBlock('minihexa_start_thread');
        const bodyAngle = new TestBlock('minihexa_set_body_angle', {
            ANGLE: '2',
            VALUE: 5,
            DURATION: 500
        });
        const move = new TestBlock('minihexa_set_go', {
            SPEED: 3,
            MOVE: '6',
            DURATION: 400
        });
        main.next = bodyAngle;
        bodyAngle.next = move;

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toContain('minihexa = Hiwonder.Robot()');
        expect(code).toContain('def start_main():');
        expect(code).toContain('Hiwonder.startMain(start_main)');
        expect(code).toContain('minihexa.set_body_angle([0,5,0],500)');
        expect(code).toContain('minihexa.go([-3,-3,0],-1,400)');
    });

    test('moves legacy start-run body to top-level setup code', () => {
        const startRun = new TestBlock('minihexa_start_run_thread');
        const baudrate = new TestBlock('minihexa_serial_set_baudrate', {DATA: '115200'});
        const write = new TestBlock('minihexa_serial_write', {DATA: 'CMD'});
        startRun.next = baudrate;
        baudrate.next = write;

        const code = generatePythonCode(createWorkspace([startRun]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toContain('uart = Hiwonder.UART(115200)');
        expect(code).toContain('uart.send_data("CMD")');
        expect(code).not.toContain('def start_run():');
    });

    test('generates every direction selector as the legacy coordinate vector', () => {
        const main = new TestBlock('minihexa_start_thread');
        const bodyPose = new TestBlock('minihexa_set_body_pose', {
            ORIENTION: '4',
            VALUE: 2,
            DURATION: 500
        });
        const moveStep = new TestBlock('minihexa_set_go_step', {
            SPEED: 3,
            MOVE: '5',
            STEP: 4,
            DURATION: 400
        });
        const turn = new TestBlock('minihexa_set_turn', {
            SPEED: 6,
            MOVE: '1',
            DURATION: 300
        });
        const turnStep = new TestBlock('minihexa_set_turn_step', {
            SPEED: 7,
            MOVE: '2',
            STEP: 2,
            DURATION: 200
        });
        main.next = bodyPose;
        bodyPose.next = moveStep;
        moveStep.next = turn;
        turn.next = turnStep;

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toContain('minihexa.set_body_pose([-2,2,0],500)');
        expect(code).toContain('minihexa.go([3,3,0],4,400)');
        expect(code).toContain('minihexa.go([0,0,-6],-1,300)');
        expect(code).toContain('minihexa.go([0,0,7],2,200)');
    });

    test('generates key callback and nested IMU reporter metadata', () => {
        const keyHat = new TestBlock('minihexa_when_minihexa_key_click_thread');
        const imu = new TestBlock('minihexa_imu_read_gyro_data', {SELECT: '2'});
        const print = new TestBlock('minihexa_print_number', {}, {NUM: imu});
        keyHat.next = print;

        const code = generatePythonCode(createWorkspace([keyHat]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toContain('button1 = Hiwonder.Button()');
        expect(code).toContain('imu = Hiwonder.IMU()');
        expect(code).toContain('def on_button1_clicked():');
        expect(code).toContain('print(imu.read_gyro_data()[2])');
        expect(code).toContain('button1.Clicked(on_button1_clicked)');
    });

    test('keeps the legacy direct leg-lift argument', () => {
        const main = new TestBlock('minihexa_start_thread');
        const height = new TestBlock('math_number', {NUM: 3});
        main.next = new TestBlock('minihexa_set_leg_lift', {}, {VALUE: height});

        const code = generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(code).toContain('minihexa.set_leg_lift(3)');
        expect(code).not.toContain('max(2,min(4,3))');
    });

    test('updates motion code when a registered dropdown field changes', () => {
        const manifest = builtinProductManifests.minihexa;
        const main = new TestBlock('minihexa_start_thread');
        const move = new TestBlock('minihexa_set_go', {
            SPEED: 3,
            MOVE: '0',
            DURATION: 500
        });
        main.next = move;
        registerPythonCodegenManifest(manifest);

        const generate = () => generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate
        });

        expect(generate()).toContain('minihexa.go([0,3,0],-1,500)');
        move.fields.MOVE = '1';
        expect(generate()).toContain('minihexa.go([0,-3,0],-1,500)');
        move.fields.MOVE = '3';
        expect(generate()).toContain('minihexa.go([3,0,0],-1,500)');

        unregisterPythonCodegenManifest(manifest);
    });

    test('reads motion selector values from an extension menu shadow', () => {
        const main = new TestBlock('minihexa_start_thread');
        const directionMenu = new TestBlock('minihexa_menu_oriention_8', {oriention_8: '6'});
        const move = new TestBlock('minihexa_set_go', {
            SPEED: 3,
            DURATION: 500
        }, {MOVE: directionMenu});
        main.next = move;

        const generate = () => generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(generate()).toContain('minihexa.go([-3,-3,0],-1,500)');
        directionMenu.fields.oriention_8 = '3';
        expect(generate()).toContain('minihexa.go([3,0,0],-1,500)');
    });

    test('updates inline motion parameters from an extension menu shadow', () => {
        const main = new TestBlock('minihexa_start_thread');
        const heightMenu = new TestBlock('minihexa_menu_oriention_9', {oriention_9: '1'});
        const height = new TestBlock('minihexa_set_body_pose_height', {
            VALUE: 2,
            DURATION: 500
        }, {ORIENTION: heightMenu});
        main.next = height;

        const generate = () => generatePythonCode(createWorkspace([main]), {
            getPythonCodegenTemplate: getMiniHexaTemplate
        });

        expect(generate()).toContain('minihexa.set_body_pose([0,0,2*1],500)');
        heightMenu.fields.oriention_9 = '-1';
        expect(generate()).toContain('minihexa.set_body_pose([0,0,2*-1],500)');
    });
});
