import {normalizeCustomExtensionManifest} from '../manifest-schema';

const hardwareImports = [
    'import Hiwonder',
    'import time',
    'import Hiwonder_DEV'
];

const mecanumCarVariable = 'mecanumCar = Hiwonder_DEV.DEV_MecanumCar()';
const buzzerVariable = 'beep = Hiwonder.Buzzer()';
const rgbVariable = 'rgb = Hiwonder.RGB()';
const imuVariable = 'imu = Hiwonder.IMU()';

const menu = items => ({
    items: items.map(([text, value]) => ({text, value: String(value)}))
});

const arg = (type, defaultValue, options = {}) => ({
    type,
    defaultValue,
    ...options
});

const codegen = (template, options = {}) => ({
    python: {
        template,
        imports: options.imports || [],
        variables: options.variables || [],
        setups: options.setups || [],
        entryTemplate: options.entryTemplate || '',
        entryFooter: options.entryFooter || '',
        launcher: options.launcher || '',
        section: options.section || ''
    }
});

const block = (opcode, blockType, text, args, template, options = {}) => ({
    opcode,
    blockType,
    text,
    arguments: args,
    codegen: codegen(template, options)
});

const command = (opcode, text, args, template, options) => (
    block(opcode, 'command', text, args, template, options)
);

const reporter = (opcode, text, args, template, options) => (
    block(opcode, 'reporter', text, args, template, options)
);

const booleanBlock = (opcode, text, args, template, options) => (
    block(opcode, 'boolean', text, args, template, options)
);

const mainHat = (opcode, text, args, options) => (
    block(opcode, 'hat', text, args, '', {
        imports: hardwareImports,
        section: 'main',
        ...options
    })
);

const aimecanumManifest = normalizeCustomExtensionManifest({
    formatVersion: 2,
    id: 'aimecanum',
    name: 'AI机甲麦轮车',
    version: '0.2.1',
    description: '从旧版 AI机甲麦轮车扩展迁移的 Python 积木库。',
    color1: '#1874cd',
    color2: '#145fa8',
    color3: '#104b85',
    target: 'python',
    source: 'builtin-product',
    menus: {
        tones: menu([
            ['C2', 65], ['D2', 73], ['E2', 82], ['F2', 87], ['G2', 98], ['A2', 110], ['B2', 123],
            ['C3', 131], ['D3', 147], ['E3', 165], ['F3', 175], ['G3', 196], ['A3', 220], ['B3', 247],
            ['C4', 262], ['D4', 294], ['E4', 330], ['F4', 349], ['G4', 392], ['A4', 440], ['B4', 494]
        ]),
        rhythms: menu([
            ['二分之一', 500], ['四分之一', 250], ['八分之一', 125], ['一拍', 1000], ['两拍', 2000],
            ['长音', 5000], ['0', 0]
        ]),
        buzzerMode: menu([['后台播放', 'False'], ['前台播放(阻塞)', 'True']]),
        keys: menu([['A', 'A'], ['B', 'B']]),
        wheels: menu([['左前', 4], ['左后', 3], ['右前', 2], ['右后', 1]]),
        wheelMotors: menu([['左前轮(EM4)', 4], ['左后轮(EM3)', 3], ['右前轮(EM2)', 2], ['右后轮(EM1)', 1]]),
        sides: menu([['左侧', 0], ['右侧', 1]]),
        lightColors: menu([['红', 0], ['绿', 1], ['蓝', 2], ['黄', 3], ['紫', 4], ['青', 5], ['白', 6]]),
        oriention8: menu([
            ['前进', 0], ['后退', 180], ['左移', 90], ['右移', -90],
            ['左前', 45], ['右前', -45], ['左后', 135], ['右后', -135]
        ]),
        oriention4: menu([['前进', 0], ['后退', 180], ['左移', 90], ['右移', -90]]),
        orientionTurn: menu([['原地左转', 1], ['原地右转', -1]]),
        eulerElement: menu([['Z轴角度', 0], ['X轴角度', 1], ['Y轴角度', 2]]),
        line6Sensor: menu([['前置', 'LF1'], ['后置', 'LF2']]),
        line6Mask: menu([['1', 1], ['2', 2], ['3', 4], ['4', 8], ['5', 16], ['6', 32]]),
        linefollows6: menu([['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6]]),
        linedot2: menu([['◌', '== 0'], ['●', '> 0']]),
        line6Status: menu([
            ['000000', '00'],
            ['000001', '01'],
            ['000011', '03'],
            ['000111', '07'],
            ['001111', '0f'],
            ['011111', '1f'],
            ['111111', '3f']
        ]),
        moveDirection: menu([['前进', 1], ['后退', -1]]),
        nums: menu([['全部', 0], ['1', 1], ['2', 2], ['3', 3]]),
        rgb: menu([['红', 1], ['绿', 2], ['蓝', 3]]),
        bleMode: menu([['从机模式', 'BLE.MODE_BLE_SLAVE'], ['主机模式', 'BLE.MODE_BLE_MASTER']])
    },
    categories: [
        {id: 'main', name: '主程序', hideLabel: true, blocks: ['start_thread', 'start_run_thread']},
        {
            id: 'boardResource',
            name: '板载资源',
            blocks: [
                'buzzer_tone_set',
                'buzzer_tone_set_arg',
                'buzzer_tone_set_volume',
                'close_buzzer',
                'close_lowpower_warning',
                'get_battery_level'
            ]
        },
        {
            id: 'rgb',
            name: 'RGB彩灯',
            blocks: ['set_led_color', 'set_led_color_arg', 'rgb_module_breath_one', 'rgb_module_breath', 'close_led']
        },
        {id: 'output', name: '输出打印', blocks: ['print_str', 'print_number']},
        {id: 'button', name: '按键', blocks: ['when_key_click_thread', 'when_key_longclick_thread', 'key_is_pressed']},
        {
            id: 'motion',
            name: '运动控制',
            blocks: [
                'set_motor_speed_all',
                'set_motor_speed_one',
                'set_motor_speed_two',
                'move_oriention',
                'move_oriention_angle',
                'set_x_y_speed',
                'move_stop',
                'move_distance',
                'move_distance_arg',
                'move_all',
                'move_all_angle',
                'turn_percent',
                'turn_speed',
                'get_motor_angle',
                'reset_motor',
                'is_motor_ready',
                'is_all_ready',
                'pd_set_pd_line'
            ]
        },
        {id: 'imu', name: 'IMU传感器', blocks: ['imu_init', 'imu_cali', 'get_euler_angle_element_value']},
        {
            id: 'lineFollower',
            name: '六路巡线传感器',
            blocks: [
                'linefollower6_one_status',
                'linefollower6_status',
                'linefollower6_set_threshold',
                'linefollower6_get_value',
                'linefollower6_read_offset'
            ]
        },
        {
            id: 'ultrasonic',
            name: '超声波传感器',
            blocks: [
                'get_led_ultrasonic_distance',
                'set_led_ultrasonic_color',
                'set_led_ultrasonic_color_arg',
                'close_led_ultrasonic',
                'set_led_ultrasonic_breath',
                'set_led_ultrasonic_random'
            ]
        },
        {
            id: 'bluetooth',
            name: '蓝牙通信',
            blocks: [
                'set_ble_mode',
                'ble_is_connected',
                'get_ble_mac',
                'ble_wait_end',
                'read_ble_data',
                'get_ble_cmd',
                'get_ble_args',
                'ble_write'
            ]
        }
    ],
    blocks: [
        // 主程序会生成 start_main 函数，并通过 Hiwonder.startMain 启动。
        mainHat('start_thread', '主程序', {}, {
            launcher: 'Hiwonder.startMain({MAIN})'
        }),
        // 当启动时用于生成顶层初始化代码，不包进 start_main 函数。
        mainHat('start_run_thread', '当启动时', {}, {
            section: 'setup'
        }),
        command('buzzer_tone_set', '播放音调为 [TONES] 节拍为 [RHYTHMS] 模式为 [MODE]', {
            TONES: arg('string', '65', {menu: 'tones', literal: true}),
            RHYTHMS: arg('string', '500', {menu: 'rhythms', literal: true}),
            MODE: arg('string', 'False', {menu: 'buzzerMode', literal: true})
        }, 'beep.playTone({TONES},{RHYTHMS},{MODE})', {
            imports: ['import Hiwonder'],
            variables: [buzzerVariable]
        }),
        command('buzzer_tone_set_arg', '播放音调为 [TONES] 节拍为 [RHYTHMS] 模式为 [MODE]', {
            TONES: arg('number', 65),
            RHYTHMS: arg('number', 500),
            MODE: arg('string', 'False', {menu: 'buzzerMode', literal: true})
        }, 'beep.playTone({TONES},{RHYTHMS},{MODE})', {
            imports: ['import Hiwonder'],
            variables: [buzzerVariable]
        }),
        command('buzzer_tone_set_volume', '设置蜂鸣器音量为 [VALUE]', {
            VALUE: arg('number', 100)
        }, 'beep.setVolume({VALUE})', {
            imports: ['import Hiwonder'],
            variables: [buzzerVariable]
        }),
        command('close_buzzer', '关闭蜂鸣器', {}, 'beep.onoff(False)', {
            imports: ['import Hiwonder'],
            variables: [buzzerVariable]
        }),
        command('close_lowpower_warning', '关闭低压报警', {}, 'Hiwonder.disableLowPowerAlarm()', {
            imports: ['import Hiwonder']
        }),
        reporter('get_battery_level', '电量值(mV)', {}, 'Hiwonder.Battery_power()', {
            imports: ['import Hiwonder']
        }),
        command('set_led_color', '设置RGB彩灯颜色 [COLOR]', {
            COLOR: arg('string', '#ffbf00')
        }, 'rgb.setRGB(0, int({COLOR}[1:3], 16), int({COLOR}[3:5], 16), int({COLOR}[5:7], 16))', {
            imports: ['import Hiwonder'],
            variables: [rgbVariable]
        }),
        command('set_led_color_arg', '设置RGB彩灯红色 [RED] 绿色 [GREEN] 蓝色 [BLUE]', {
            RED: arg('number', 255),
            GREEN: arg('number', 0),
            BLUE: arg('number', 0)
        }, 'rgb.setRGB(0,{RED},{GREEN},{BLUE})', {
            imports: ['import Hiwonder'],
            variables: [rgbVariable]
        }),
        command('rgb_module_breath_one', '设置RGB彩灯呼吸灯模式 颜色 [COLOR] 变化周期 [CYCLE] 秒', {
            COLOR: arg('string', '0', {menu: 'lightColors', literal: true}),
            CYCLE: arg('number', 1)
        }, 'rgb.set_Breathing({COLOR},{CYCLE})', {
            imports: ['import Hiwonder'],
            variables: [rgbVariable]
        }),
        command('rgb_module_breath', '设置RGB彩灯炫彩模式', {}, 'rgb.setRGBBreathingValue(5,10,15)', {
            imports: ['import Hiwonder'],
            variables: [rgbVariable]
        }),
        command('close_led', '关闭RGB彩灯', {}, 'rgb.setRGB(0,0,0,0)', {
            imports: ['import Hiwonder'],
            variables: [rgbVariable]
        }),
        command('print_str', '输出打印字符 [STR]', {
            STR: arg('string', 'Hello')
        }, 'print({STR})\ntime.sleep(0.05)', {
            imports: ['import time']
        }),
        command('print_number', '输出打印数字 [NUM]', {
            NUM: arg('number', 60)
        }, 'print({NUM})\ntime.sleep(0.05)', {
            imports: ['import time']
        }),
        mainHat('when_key_click_thread', '当 [KEYS] 键短按时', {
            KEYS: arg('string', 'A', {menu: 'keys', literal: true})
        }, {
            // 按键事件先生成回调函数，再在 footer 里注册到硬件事件。
            variables: ['button{KEYS} = Hiwonder.Button(\'{KEYS}\')'],
            entryTemplate: 'def on_button{KEYS}_clicked():',
            entryFooter: 'button{KEYS}.Clicked(on_button{KEYS}_clicked)'
        }),
        mainHat('when_key_longclick_thread', '当 [KEYS] 键长按时', {
            KEYS: arg('string', 'A', {menu: 'keys', literal: true})
        }, {
            // 长按事件和短按事件共用同一套回调注册生成规则。
            variables: ['button{KEYS} = Hiwonder.Button(\'{KEYS}\')'],
            entryTemplate: 'def on_button{KEYS}_longpressed():',
            entryFooter: 'button{KEYS}.Longpressed(on_button{KEYS}_longpressed)'
        }),
        booleanBlock('key_is_pressed', '[KEYS] 键被按下', {
            KEYS: arg('string', 'A', {menu: 'keys', literal: true})
        }, 'button{KEYS}.read()', {
            imports: ['import Hiwonder'],
            variables: ['button{KEYS} = Hiwonder.Button(\'{KEYS}\')']
        }),
        command('set_motor_speed_all', '设置麦轮速度 左前 [SPEED1] 左后 [SPEED2] 右前 [SPEED3] 右后 [SPEED4] RPM', {
            SPEED1: arg('number', 60),
            SPEED2: arg('number', 60),
            SPEED3: arg('number', 60),
            SPEED4: arg('number', 60)
        }, 'mecanumCar.set_motors_speed({SPEED4},{SPEED3},{SPEED2},{SPEED1})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_motor_speed_one', '设置麦轮 [WHEEL] 速度为 [SPEED] RPM', {
            WHEEL: arg('string', '4', {menu: 'wheels', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.set_motor_speed({WHEEL},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_motor_speed_two', '设置麦轮 [SIDE] 轮组速度为 [SPEED] RPM', {
            SIDE: arg('string', '0', {menu: 'sides', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.set_2_speeds({SIDE},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_oriention', '麦轮车方向 [ORIENTION] 速度 [SPEED] RPM', {
            ORIENTION: arg('string', '0', {menu: 'oriention8', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_dir({ORIENTION},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_oriention_angle', '麦轮车方向 [ORIENTION] 度 速度 [SPEED] RPM', {
            ORIENTION: arg('number', 0),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_dir({ORIENTION},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_x_y_speed', '设置麦轮 X轴速度 [SPEED1] Y轴速度 [SPEED2]', {
            SPEED1: arg('number', 60),
            SPEED2: arg('number', 60)
        }, 'mecanumCar.set_xy_speed({SPEED1},{SPEED2})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_stop', '停止麦轮车', {}, 'mecanumCar.stop()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_distance', '麦轮车向 [ORIENTION] 移动 [DISTANCE] cm 速度 [SPEED] RPM', {
            ORIENTION: arg('string', '0', {menu: 'oriention4', literal: true}),
            DISTANCE: arg('number', 10),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_distance({DISTANCE},{ORIENTION},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_distance_arg', '麦轮车方向 [ORIENTION] 度移动 [DISTANCE] cm 速度 [SPEED] RPM', {
            ORIENTION: arg('number', 0),
            DISTANCE: arg('number', 10),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_distance({DISTANCE},{ORIENTION},{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_all', '麦轮车 [ORIENTION] 速度百分比 [SPEED]', {
            ORIENTION: arg('string', '0', {menu: 'oriention8', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_dir({ORIENTION},{SPEED}*1.5)', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('move_all_angle', '麦轮车方向 [ORIENTION] 度 速度百分比 [SPEED]', {
            ORIENTION: arg('number', 0),
            SPEED: arg('number', 60)
        }, 'mecanumCar.move_dir({ORIENTION},{SPEED}*1.5)', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('turn_percent', '麦轮车 [ORIENTION] 速度百分比 [SPEED]', {
            ORIENTION: arg('string', '1', {menu: 'orientionTurn', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.rotate_speed({ORIENTION}*{SPEED}*1.5)', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('turn_speed', '麦轮车 [ORIENTION] 速度 [SPEED] RPM', {
            ORIENTION: arg('string', '1', {menu: 'orientionTurn', literal: true}),
            SPEED: arg('number', 60)
        }, 'mecanumCar.rotate_speed({ORIENTION}*{SPEED})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        reporter('get_motor_angle', '读取麦轮 [ID] 角度', {
            ID: arg('string', '4', {menu: 'wheelMotors', literal: true})
        }, 'mecanumCar.read_motor_angle({ID})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('reset_motor', '重置麦轮里程', {}, 'mecanumCar.reset()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        booleanBlock('is_motor_ready', '麦轮 [ID] 运动是否完成', {
            ID: arg('string', '4', {menu: 'wheelMotors', literal: true})
        }, 'mecanumCar.read_motor_ready({ID})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        booleanBlock('is_all_ready', '全部麦轮运动是否完成', {}, 'mecanumCar.read_ready()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('pd_set_pd_line', '巡线偏移 [OFFSET] 速度 [SPEED] 最大速度 [MAXSPEED] KP [KP] KD [KD] 方向 [ORIENTION]', {
            OFFSET: arg('number', 0),
            SPEED: arg('number', 40),
            MAXSPEED: arg('number', 80),
            KP: arg('number', 0.3),
            KD: arg('number', 0.1),
            ORIENTION: arg('string', '1', {menu: 'moveDirection', literal: true})
        }, 'mecanumCar.pd_set_speed({OFFSET},{SPEED},{MAXSPEED},{KP},{KD},{ORIENTION})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('imu_init', '初始化IMU传感器', {}, '', {
            imports: ['import Hiwonder'],
            variables: [imuVariable]
        }),
        command('imu_cali', '校准IMU传感器', {}, '', {
            imports: ['import Hiwonder'],
            variables: [imuVariable]
        }),
        reporter('get_euler_angle_element_value', '获取欧拉角 [VALUE]', {
            VALUE: arg('string', '0', {menu: 'eulerElement', literal: true})
        }, 'imu.get_angle()[{VALUE}]', {
            imports: ['import Hiwonder'],
            variables: [imuVariable]
        }),
        booleanBlock('linefollower6_one_status', '[SENSOR] 六路巡线传感器通道 [NUM] 检测到 [LINE]', {
            SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
            NUM: arg('string', '1', {menu: 'line6Mask', literal: true}),
            LINE: arg('string', '> 0', {menu: 'linedot2', literal: true})
        }, '(mecanumCar.{SENSOR}.get_result_data() & {NUM}) {LINE}', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        booleanBlock('linefollower6_status', '[SENSOR] 六路巡线传感器检测到 [LINE]', {
            SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
            // 组合状态后续需要接入自定义 LINE6 输入控件，当前先用下拉值承载代码生成。
            LINE: arg('string', '00', {menu: 'line6Status', literal: true})
        }, 'mecanumCar.{SENSOR}.get_result_data() == 0x{LINE}', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('linefollower6_set_threshold', '设置 [SENSOR] 六路巡线传感器阈值比例(范围1~9)为 [VALUE]', {
            SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
            VALUE: arg('number', 7)
        }, 'mecanumCar.{SENSOR}.set_ThresholdRatioReg({VALUE})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        reporter('linefollower6_get_value', '[SENSOR] 六路巡线传感器通道 [NUM] 灰度值(0~100)', {
            SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
            NUM: arg('string', '1', {menu: 'linefollows6', literal: true})
        }, 'mecanumCar.{SENSOR}.read_AnalogQuantity({NUM})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        reporter('linefollower6_read_offset', '获取 [SENSOR] 六路巡线传感器偏移值', {
            SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true})
        }, 'mecanumCar.{SENSOR}.read_offset()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        reporter('get_led_ultrasonic_distance', '超声波传感器距离(cm)', {}, 'mecanumCar.sonar.getDistance()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_led_ultrasonic_color', '设置超声波传感器灯 [NUMS] 颜色 [COLOR]', {
            NUMS: arg('string', '0', {menu: 'nums', literal: true}),
            COLOR: arg('string', '#ffbf00')
        }, 'mecanumCar.sonar.setRGB({NUMS}, int({COLOR}[1:3], 16), int({COLOR}[3:5], 16), int({COLOR}[5:7], 16))', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_led_ultrasonic_color_arg', '设置超声波传感器灯 [NUMS] 红 [RED] 绿 [GREEN] 蓝 [BLUE]', {
            NUMS: arg('string', '0', {menu: 'nums', literal: true}),
            RED: arg('number', 255),
            GREEN: arg('number', 0),
            BLUE: arg('number', 0)
        }, 'mecanumCar.sonar.setRGB({NUMS},{RED},{GREEN},{BLUE})', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('close_led_ultrasonic', '关闭超声波传感器灯 [NUMS]', {
            NUMS: arg('string', '0', {menu: 'nums', literal: true})
        }, 'mecanumCar.sonar.setRGB({NUMS},0,0,0)', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_led_ultrasonic_breath', '设置超声波传感器灯 [NUM] 呼吸颜色 [RGB] 周期 [TIME] 秒', {
            NUM: arg('string', '0', {menu: 'nums', literal: true}),
            RGB: arg('string', '1', {menu: 'rgb', literal: true}),
            TIME: arg('number', 1)
        }, 'mecanumCar.sonar.setBreathingCycle({NUM},{RGB},{TIME} * 10)', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_led_ultrasonic_random', '设置超声波传感器灯炫彩模式', {}, 'mecanumCar.sonar.startSymphony()', {
            imports: ['import Hiwonder_DEV'],
            variables: [mecanumCarVariable]
        }),
        command('set_ble_mode', '设置蓝牙模式 [MODE] 名称 [NAME]', {
            MODE: arg('string', 'BLE.MODE_BLE_SLAVE', {menu: 'bleMode', literal: true}),
            NAME: arg('string', 'Hiwonder')
        }, '', {
            imports: ['from Hiwonder_BLE import BLE'],
            variables: ['ble = BLE({MODE}, {NAME})']
        }),
        booleanBlock('ble_is_connected', '蓝牙是否已连接', {}, 'ble.is_connected()'),
        reporter('get_ble_mac', '获取蓝牙MAC地址', {}, 'ble.get_mac()'),
        booleanBlock('ble_wait_end', '蓝牙是否收到 [VALUE]', {
            VALUE: arg('string', 'OK')
        }, 'ble.contains_data({VALUE})'),
        reporter('read_ble_data', '读取蓝牙数据', {}, 'ble.read_uart_cmd()'),
        reporter('get_ble_cmd', '解析蓝牙数据 [DATA] 命令', {
            DATA: arg('string', 'data')
        }, 'ble.parse_uart_cmd({DATA})[0]'),
        reporter('get_ble_args', '解析蓝牙数据 [DATA] 参数 [NUM]', {
            DATA: arg('string', 'data'),
            NUM: arg('number', 1)
        }, 'ble.parse_uart_cmd({DATA})[{NUM}]'),
        command('ble_write', '蓝牙发送 [DATA]', {
            DATA: arg('string', 'Hello')
        }, 'ble.send_data({DATA})')
    ]
});

export default aimecanumManifest;
