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
