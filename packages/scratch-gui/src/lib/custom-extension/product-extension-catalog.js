// modules 按卡片的 sourceExtension 分组，只描述硬件兼容性，不表示模块包已经迁移或发布。
const productExtensionCatalog = [
    {
        id: 'robots',
        label: '机器人',
        children: [
            {
                id: 'aimech',
                name: 'AI机甲双驱车',
                sourceExtension: 'aimech',
                modules: {
                    sensor: [
                        'knob', 'light-sensor', 'rain-sensor', 'soil-sensor', 'sound-sensor',
                        'infrared-sensor', 'touch-sensor', 'button-module',
                        'color-sensor', 'temperature-humidity', 'line-6', 'line-4', 'line-4-rotary',
                        'imu-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens', 'wonder-mind',
                        'k230-vision'
                    ],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm', 'xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix', 'rgb-module', 'digit-display', 'oled'],
                    communication: ['communication']
                },
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'aimecanum',
                name: 'AI机甲麦轮车',
                sourceExtension: 'aimecanum',
                modules: {
                    sensor: [
                        'knob', 'light-sensor', 'rain-sensor', 'soil-sensor', 'sound-sensor',
                        'infrared-sensor', 'touch-sensor', 'button-module',
                        'color-sensor', 'temperature-humidity', 'line-6', 'line-4', 'line-4-rotary', 'imu-sensor',
                        'led-ultrasonic', 'wonder-echo', 'wonder-lens', 'wonder-mind', 'k230-vision'
                    ],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix', 'rgb-module', 'digit-display', 'oled'],
                    communication: ['communication']
                },
                version: '0.2.3',
                latestVersion: '0.2.3',
                status: 'available'
            },
            {
                id: 'aiquadruped',
                name: 'AI机甲四足机器人',
                sourceExtension: 'aiquadruped',
                modules: {
                    sensor: [
                        'knob', 'light-sensor', 'rain-sensor', 'soil-sensor', 'sound-sensor',
                        'infrared-sensor', 'touch-sensor', 'button-module',
                        'color-sensor', 'temperature-humidity', 'line-6', 'line-4', 'line-4-rotary',
                        'imu-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens', 'wonder-mind',
                        'k230-vision'
                    ],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix', 'rgb-module', 'digit-display', 'oled'],
                    communication: ['communication']
                },
                version: '1.0.0',
                latestVersion: '1.0.0',
                status: 'available'
            },
            {
                id: 'aiquadrupedpro',
                name: 'AI机甲四足竞赛版',
                sourceExtension: 'aiquadrupedpro',
                modules: {
                    sensor: [
                        'knob', 'light-sensor', 'rain-sensor', 'soil-sensor', 'sound-sensor',
                        'infrared-sensor', 'touch-sensor', 'button-module',
                        'color-sensor', 'temperature-humidity', 'line-6', 'line-4', 'line-4-rotary',
                        'imu-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens', 'wonder-mind',
                        'k230-vision'
                    ],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix', 'rgb-module', 'digit-display', 'oled'],
                    communication: ['communication']
                },
                version: '1.0.0',
                latestVersion: '1.0.0',
                status: 'available'
            },
            {
                id: 'aihexa',
                name: 'AI机甲六足机器人',
                sourceExtension: 'aihexa',
                modules: {
                    sensor: [
                        'knob', 'light-sensor', 'rain-sensor', 'soil-sensor', 'sound-sensor',
                        'infrared-sensor', 'touch-sensor', 'button-module',
                        'color-sensor', 'temperature-humidity', 'line-6', 'line-4', 'line-4-rotary',
                        'imu-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens', 'wonder-mind',
                        'k230-vision'
                    ],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix', 'rgb-module', 'digit-display', 'oled'],
                    communication: ['communication']
                },
                version: '1.0.0',
                latestVersion: '1.0.0',
                status: 'available'
            },
            {
                id: 'minihexa',
                name: 'miniHexa',
                sourceExtension: 'minihexa',
                modules: {
                    sensor: ['infrared-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens']
                },
                version: '0.1.1',
                latestVersion: '0.1.1',
                status: 'available'
            },
            {
                id: 'aidoggy',
                name: 'AiDoggy',
                sourceExtension: 'aidoggy',
                modules: {
                    sensor: ['temperature-humidity', 'led-ultrasonic'],
                    actuator: ['bus-servo', 'iic-pwm', 'fan'],
                    xarm: ['xarm-series', 'xarm-linkage'],
                    display: ['dot-matrix'],
                    communication: ['communication']
                },
                version: '0.1.0',
                latestVersion: '0.1.0',
                status: 'available'
            }
        ]
    },
    {
        id: 'input',
        label: '输入模块',
        children: [
            {
                id: 'color-sensor',
                name: '颜色识别模块',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'line-4',
                name: '四路巡线传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'line-4-rotary',
                name: '旋钮四路巡线传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'line-6',
                name: '六路巡线传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'wonder-echo',
                name: 'WonderEcho语音模块',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'ultrasonic',
                name: '超声波传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'knob',
                name: '旋钮',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'light-sensor',
                name: '光线传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'rain-sensor',
                name: '雨滴传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'soil-sensor',
                name: '土壤传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'sound-sensor',
                name: '声音传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'temperature-humidity',
                name: '温湿度传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'infrared-sensor',
                name: '红外检测传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'touch-sensor',
                name: '触摸传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'button-module',
                name: '按键模块',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'imu-sensor',
                name: 'IMU传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'led-ultrasonic',
                name: 'LED超声波传感器',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                // TODO：WonderLens 目前只迁移 10/54 个积木，剩余 44 个；暂停后续迁移时不得视为完整模块。
                id: 'wonder-lens',
                name: 'WonderLens视觉模块',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                // TODO：WonderMind 仍有 20 个积木未迁移，仅支持五款大型 AI 机甲。
                id: 'wonder-mind',
                name: 'WonderMind',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'k230-vision',
                name: 'K230视觉模块',
                sourceExtension: 'sensor',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            }
        ]
    },
    {
        id: 'power',
        label: '动力模块',
        children: [
            {
                id: 'bus-servo',
                name: '总线舵机',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'servo-180',
                name: '180°舵机',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'servo-360',
                name: '360°舵机',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'iic-pwm',
                name: 'IIC转PWM控制模块',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'long-motor',
                name: '长电机',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'xarm',
                name: 'AI机甲机械臂',
                sourceExtension: 'xarm',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'xarm-series',
                name: 'AI机甲串联机械臂',
                sourceExtension: 'xarm',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'xarm-linkage',
                name: 'AI机甲连杆机械臂',
                sourceExtension: 'xarm',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            }
        ]
    },
    {
        id: 'output',
        label: '输出模块',
        children: [
            {
                id: 'dot-matrix',
                name: '点阵屏',
                sourceExtension: 'display',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'rgb-module',
                name: 'RGB模块',
                sourceExtension: 'display',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'digit-display',
                name: '数码管',
                sourceExtension: 'display',
                version: '0.0.0',
                latestVersion: '1.2.0',
                status: 'planned'
            },
            {
                id: 'oled',
                name: 'OLED-12864',
                sourceExtension: 'display',
                version: '0.0.0',
                latestVersion: '1.2.0',
                status: 'planned'
            },
            {
                id: 'fan',
                name: '风扇',
                sourceExtension: 'actuator',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            }
        ]
    },
    {
        id: 'communication',
        label: '通信模块',
        children: [
            {
                id: 'communication',
                name: '通信模块',
                sourceExtension: 'communication',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            }
        ]
    },
    {
        id: 'function',
        label: '功能模块',
        children: [
            {
                id: 'aiblocks',
                name: 'AI Blocks',
                sourceExtension: 'aiblocks',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            },
            {
                id: 'function-module',
                name: '功能模块',
                sourceExtension: 'function_module',
                version: '0.0.0',
                latestVersion: '1.0.0',
                status: 'planned'
            }
        ]
    }
];

export {
    productExtensionCatalog
};
