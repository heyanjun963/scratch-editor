const test = require('tap').test;
const generatePythonCode = require('../../src/codegen/python');

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

test('custom main template can collect imports variables globals and launcher', t => {
    const main = new TestBlock('company_start');
    const move = new TestBlock('company_move', {SPEED: 60});
    main.next = move;

    const templates = {
        company_start: {
            blockType: 'hat',
            section: 'main',
            imports: ['Hiwonder'],
            launcher: 'Hiwonder.startMain({MAIN})',
            template: ''
        },
        company_move: {
            blockType: 'command',
            imports: ['Hiwonder_DEV'],
            variables: ['mecanumCar = Hiwonder_DEV.DEV_MecanumCar()'],
            arguments: {
                SPEED: {
                    defaultValue: 50
                }
            },
            template: 'mecanumCar.set_motors_speed({SPEED})'
        }
    };

    const code = generatePythonCode(createWorkspace([main]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.equal(code, [
        'import Hiwonder',
        'import Hiwonder_DEV',
        '',
        '# initialize variables',
        'mecanumCar = Hiwonder_DEV.DEV_MecanumCar()',
        '',
        'def start_main():',
        '    global mecanumCar',
        '    mecanumCar.set_motors_speed(60)',
        '',
        'Hiwonder.startMain(start_main)'
    ].join('\n'));
    t.end();
});

test('multiple custom main hats receive stable entry names', t => {
    const firstMain = new TestBlock('company_start');
    const secondMain = new TestBlock('company_start');

    const templates = {
        company_start: {
            blockType: 'hat',
            section: 'main',
            launcher: 'Hiwonder.startMain({MAIN})',
            template: ''
        }
    };

    const code = generatePythonCode(createWorkspace([firstMain, secondMain]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.match(code, /def start_main\(\):/);
    t.match(code, /Hiwonder\.startMain\(start_main\)/);
    t.match(code, /def start_main1\(\):/);
    t.match(code, /Hiwonder\.startMain\(start_main1\)/);
    t.end();
});

test('custom event hat can render callback registration', t => {
    const keyHat = new TestBlock('aimecanum_when_key_click_thread', {KEYS: 'A'});
    const move = new TestBlock('aimecanum_set_motor_speed_all', {
        SPEED1: 60,
        SPEED2: 60,
        SPEED3: 60,
        SPEED4: 60
    });
    keyHat.next = move;

    const templates = {
        aimecanum_when_key_click_thread: {
            blockType: 'hat',
            section: 'main',
            imports: ['import Hiwonder'],
            variables: ['button{KEYS} = Hiwonder.Button(\'{KEYS}\')'],
            arguments: {
                KEYS: {
                    defaultValue: 'A',
                    literal: true
                }
            },
            entryTemplate: 'def on_button{KEYS}_clicked():',
            entryFooter: 'button{KEYS}.Clicked(on_button{KEYS}_clicked)',
            template: ''
        },
        aimecanum_set_motor_speed_all: {
            blockType: 'command',
            imports: ['import Hiwonder_DEV'],
            variables: ['mecanumCar = Hiwonder_DEV.DEV_MecanumCar()'],
            arguments: {
                SPEED1: {defaultValue: 60},
                SPEED2: {defaultValue: 60},
                SPEED3: {defaultValue: 60},
                SPEED4: {defaultValue: 60}
            },
            template: 'mecanumCar.set_motors_speed({SPEED4},{SPEED3},{SPEED2},{SPEED1})'
        }
    };

    const code = generatePythonCode(createWorkspace([keyHat]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.equal(code, [
        'import Hiwonder',
        'import Hiwonder_DEV',
        '',
        '# initialize variables',
        'buttonA = Hiwonder.Button(\'A\')',
        'mecanumCar = Hiwonder_DEV.DEV_MecanumCar()',
        '',
        'def on_buttonA_clicked():',
        '    global mecanumCar',
        '    mecanumCar.set_motors_speed(60,60,60,60)',
        '',
        'buttonA.Clicked(on_buttonA_clicked)'
    ].join('\n'));
    t.end();
});

test('loose command blocks are ignored outside an entry stack', t => {
    const loosePrint = new TestBlock('aimecanum_print_str', {STR: 'loose'});

    const templates = {
        aimecanum_print_str: {
            blockType: 'command',
            arguments: {
                STR: {
                    defaultValue: 'Hello'
                }
            },
            template: 'print({STR})'
        }
    };

    const code = generatePythonCode(createWorkspace([loosePrint]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.equal(code, '# Drag Python blocks here to generate code.');
    t.end();
});

test('custom setup hat renders top-level code', t => {
    const startRun = new TestBlock('aimecanum_start_run_thread');
    const print = new TestBlock('aimecanum_print_str', {STR: 'boot'});
    startRun.next = print;

    const templates = {
        aimecanum_start_run_thread: {
            blockType: 'hat',
            section: 'setup',
            imports: ['import Hiwonder'],
            template: ''
        },
        aimecanum_print_str: {
            blockType: 'command',
            arguments: {
                STR: {
                    defaultValue: 'Hello'
                }
            },
            template: 'print({STR})'
        }
    };

    const code = generatePythonCode(createWorkspace([startRun]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.equal(code, [
        'import Hiwonder',
        '',
        'print("boot")'
    ].join('\n'));
    t.end();
});

test('empty custom setup hat keeps preamble imports', t => {
    const startRun = new TestBlock('aimecanum_start_run_thread');

    const templates = {
        aimecanum_start_run_thread: {
            blockType: 'hat',
            section: 'setup',
            imports: ['import Hiwonder', 'import time', 'import Hiwonder_DEV'],
            template: ''
        }
    };

    const code = generatePythonCode(createWorkspace([startRun]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.equal(code, [
        'import Hiwonder',
        'import Hiwonder_DEV',
        'import time',
        ''
    ].join('\n'));
    t.end();
});

test('custom setup hats do not consume main entry names', t => {
    const startRun = new TestBlock('aimecanum_start_run_thread');
    const main = new TestBlock('aimecanum_start_thread');

    const templates = {
        aimecanum_start_run_thread: {
            blockType: 'hat',
            section: 'setup',
            template: ''
        },
        aimecanum_start_thread: {
            blockType: 'hat',
            section: 'main',
            launcher: 'Hiwonder.startMain({MAIN})',
            template: ''
        }
    };

    const code = generatePythonCode(createWorkspace([startRun, main]), {
        getPythonCodegenTemplate: blockType => templates[blockType]
    });

    t.match(code, /def start_main\(\):/);
    t.match(code, /Hiwonder\.startMain\(start_main\)/);
    t.notMatch(code, /def start_main1\(\):/);
    t.notMatch(code, /def start_run\(\):/);
    t.end();
});
