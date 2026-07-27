//% color="#4682b4" iconWidth=50 iconHeight=40
namespace aidoggy {
    //% block="main program" blockType="hat"
    export function start_thread(parameter: any, block: any) {
        Generator.addImport("import Hiwonder");
        Generator.addImport("aidoggy = Hiwonder.AIDoggy()");
    }

    //% block="when started" blockType="hat"
    export function start_run_thread(parameter: any, block: any) {
        Generator.addImport("import Hiwonder");
        Generator.addImport("aidoggy = Hiwonder.AIDoggy()");
    }

    //% block="play tone [TONES] rhythm [RHYTHMS] interval [VALUE] ms repeat [VALUE2] times" blockType="command"
    //% TONES.shadow="dropdown" TONES.options="tones"
    //% RHYTHMS.shadow="dropdown" RHYTHMS.options="rhythms"
    //% VALUE.shadow="number" VALUE.defl=100
    //% VALUE2.shadow="number" VALUE2.defl=1
    export function buzzer_tone_set(parameter: any, block: any) {
        const tone = parameter.TONES.code;
        const rhythm = parameter.RHYTHMS.code;
        const interval = parameter.VALUE.code;
        const repeat = parameter.VALUE2.code;
        Generator.addImport("beep = Hiwonder.Buzzer()");
        Generator.addCode(`beep.set_buzzer(${tone},${rhythm},${interval},${repeat})`);
    }

    //% block="play tone [TONES] rhythm [RHYTHMS] interval [VALUE] ms repeat [VALUE2] times" blockType="command"
    //% TONES.shadow="number" TONES.defl=65
    //% RHYTHMS.shadow="number" RHYTHMS.defl=500
    //% VALUE.shadow="number" VALUE.defl=100
    //% VALUE2.shadow="number" VALUE2.defl=1
    export function buzzer_tone_set_arg(parameter: any, block: any) {
        const tone = parameter.TONES.code;
        const rhythm = parameter.RHYTHMS.code;
        const interval = parameter.VALUE.code;
        const repeat = parameter.VALUE2.code;
        Generator.addCode(`beep.set_buzzer(${tone},${rhythm},${interval},${repeat})`);
    }

    //% block="battery voltage (mV)" blockType="reporter"
    export function get_battery_level(parameter: any, block: any) {
        Generator.addImport("rsys = Hiwonder.Robot_System()");
        Generator.addCode("rsys.read_battery_voltage()");
    }

    //% block="[VALUE] low voltage alarm" blockType="command"
    //% VALUE.shadow="dropdown" VALUE.options="on_off"
    export function set_low_battery_alarm(parameter: any, block: any) {
        const enabled = parameter.VALUE.code;
        Generator.addImport("rsys = Hiwonder.Robot_System()");
        Generator.addCode(`rsys.set_low_voltage_alarm_enable(${enabled})`);
    }

    //% block="print text [STR]" blockType="command"
    //% STR.shadow="string" STR.defl="Hello"
    export function print_str(parameter: any, block: any) {
        const text = parameter.STR.code;
        Generator.addImport("import time");
        Generator.addCode(`print(${text})\ntime.sleep(0.05)`);
    }

    //% block="print number [NUM]" blockType="command"
    //% NUM.shadow="number" NUM.defl=60
    export function print_number(parameter: any, block: any) {
        const number = parameter.NUM.code;
        Generator.addImport("import time");
        Generator.addCode(`print(${number})\ntime.sleep(0.05)`);
    }

    //% block="set pose in [VALUE6] ms pitch [VALUE1] roll [VALUE2] height [VALUE3] x [VALUE4] y [VALUE5]" blockType="command"
    //% VALUE1.shadow="number" VALUE1.defl=0
    //% VALUE2.shadow="number" VALUE2.defl=0
    //% VALUE3.shadow="number" VALUE3.defl=0
    //% VALUE4.shadow="number" VALUE4.defl=0
    //% VALUE5.shadow="number" VALUE5.defl=0
    //% VALUE6.shadow="number" VALUE6.defl=1000
    export function set_pose(parameter: any, block: any) {
        const pitch = parameter.VALUE1.code;
        const roll = parameter.VALUE2.code;
        const height = parameter.VALUE3.code;
        const bodyX = parameter.VALUE4.code;
        const bodyY = parameter.VALUE5.code;
        const duration = parameter.VALUE6.code;
        Generator.addCode(`aidoggy.set_pose(${pitch},${roll},${height},${bodyX},${bodyY},${duration})`);
    }

    //% block="move speed [VALUE5] direction [VALUE1] distance [VALUE2] step [VALUE3] lift [VALUE4]" blockType="command"
    //% VALUE1.shadow="dropdown" VALUE1.options="orientation"
    //% VALUE2.shadow="number" VALUE2.defl=200
    //% VALUE3.shadow="number" VALUE3.defl=40
    //% VALUE4.shadow="number" VALUE4.defl=30
    //% VALUE5.shadow="number" VALUE5.defl=80
    export function set_move(parameter: any, block: any) {
        const direction = parameter.VALUE1.code;
        const distance = parameter.VALUE2.code;
        const step = parameter.VALUE3.code;
        const lift = parameter.VALUE4.code;
        const speed = parameter.VALUE5.code;
        Generator.addCode(`aidoggy.move(${direction},${distance},${step},${lift},${speed})`);
    }

    //% block="omni move x [VALUE1] y [VALUE2] omega [VALUE3] step [VALUE4] lift [VALUE5]" blockType="command"
    //% VALUE1.shadow="number" VALUE1.defl=0
    //% VALUE2.shadow="number" VALUE2.defl=0
    //% VALUE3.shadow="number" VALUE3.defl=0
    //% VALUE4.shadow="number" VALUE4.defl=40
    //% VALUE5.shadow="number" VALUE5.defl=30
    export function set_move_xyz(parameter: any, block: any) {
        const speedX = parameter.VALUE1.code;
        const speedY = parameter.VALUE2.code;
        const omega = parameter.VALUE3.code;
        const step = parameter.VALUE4.code;
        const lift = parameter.VALUE5.code;
        Generator.addCode(`aidoggy.omni_move(${speedX},${speedY},${omega},${step},${lift})`);
    }

    //% block="turn speed [VALUE1] direction [VALUE2]" blockType="command"
    //% VALUE1.shadow="number" VALUE1.defl=0
    //% VALUE2.shadow="dropdown" VALUE2.options="oriention_turn"
    export function set_turn(parameter: any, block: any) {
        const speed = parameter.VALUE1.code;
        Generator.addCode(`aidoggy.omni_move(0,0,${speed},0,0)`);
    }

    //% block="set gait [VALUE1]" blockType="command"
    //% VALUE1.shadow="dropdown" VALUE1.options="gait"
    export function set_gait(parameter: any, block: any) {
        const gait = parameter.VALUE1.code;
        Generator.addCode(`aidoggy.set_gait(${gait})`);
    }

    //% block="stop moving" blockType="command"
    export function set_stop(parameter: any, block: any) {
        Generator.addCode("aidoggy.stop()");
    }

    //% block="run action name [ACTION] [BLOCK]" blockType="command"
    //% ACTION.shadow="string" ACTION.defl="sit_preset"
    //% BLOCK.shadow="dropdown" BLOCK.options="blocking"
    export function run_action(parameter: any, block: any) {
        const action = parameter.ACTION.code;
        const blocking = parameter.BLOCK.code;
        Generator.addCode(`aidoggy.run_action_group(${action},${blocking})`);
    }

    //% block="run preset action [ACTION] [BLOCK]" blockType="command"
    //% ACTION.shadow="dropdown" ACTION.options="action_name"
    //% BLOCK.shadow="dropdown" BLOCK.options="blocking"
    export function run_action_name(parameter: any, block: any) {
        const action = parameter.ACTION.code;
        const blocking = parameter.BLOCK.code;
        Generator.addCode(`aidoggy.run_action_group('${action}',${blocking})`);
    }

    //% block="stop action" blockType="command"
    export function stop_action(parameter: any, block: any) {
        Generator.addCode("aidoggy.action_stop()");
    }
}
