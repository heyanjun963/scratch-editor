import generatePythonCode from '../../../../../scratch-vm/src/codegen/python';

import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {manifestToExtensionObject} from '../../../../src/lib/custom-extension/manifest-to-extension';
import {composeProductModuleManifest} from '../../../../src/lib/custom-extension/product-module-support';

const EXPECTED_OPCODES = [
    'aimech_read_knob',
    'aimech_read_light',
    'aimech_get_rain_drop_value',
    'aimech_get_soil_value',
    'aimech_read_sound',
    'aimech_get_avoid_value',
    'aimech_read_touch',
    'aimech_key_is_pressed',
    'get_ultrasonic_distance',
    'aimech_colorsensor_init',
    'aiblocks_check_color',
    'aiblocks_get_color',
    'aiblocks_get_color_arg',
    'aimech_temphumi_init',
    'aimech_get_temp_and_humi',
    'aimech_get_temp_or_humi',
    'aimech_linefollower6_init',
    'linefollower6_one_status',
    'linefollower6_status',
    'linefollower6_set_threshold',
    'linefollower6_get_value',
    'linefollower6_read_offset',
    'aimech_linefollower_init',
    'linefollower_one_status',
    'linefollower_status',
    'linefollower_status_result',
    'linefollower_read_offset',
    'linefollower4_init',
    'linefollower4_one_status',
    'linefollower4_status_result',
    'linefollower4_read_offset',
    'aimech_imu_init',
    'get_euler_angle_element_value',
    'get_euler_angle',
    'get_euler_angle_element',
    'aimech_led_ultrasonic_init',
    'aimech_get_led_ultrasonic_distance',
    'aimech_set_led_ultrasonic_color',
    'aimech_set_led_ultrasonic_color_arg',
    'aimech_close_led_ultrasonic',
    'aimech_set_led_ultrasonic_breath',
    'aimech_set_led_ultrasonic_random',
    'aimech_wonderecho_init',
    'wonderecho_get_results',
    'wonderecho_results',
    'wonderecho_get_result_num',
    'wonderecho_speech_cmd',
    'wonderecho_speech_cmd_number',
    'wonderecho_speech_play',
    'wonderecho_speech_play_number',
    'k230_aimech_init',
    'k230_set_mode',
    'k230_set_run',
    'k230_set_volumn',
    'k230_set_wifi',
    'k230_update_detect_result',
    'k230_mcp_action_setting',
    'k230_mcp_move_setting',
    'k230_mcp_setting',
    'k230_result_exists',
    'k230_get_result',
    'k230_send_mcp_result',
    'k230_aimecanum_set_mcp_default',
    'k230_aiquadruped_set_mcp_default',
    'k230_aiquadrupedpro_set_mcp_default',
    'k230_aihexa_set_mcp_default',
    'k230_get_default_mcp_name',
    'k230_get_buzzer_params',
    'k230_get_rgb_light_params',
    'k230_get_sonar_rgb_params',
    'k230_get_arm_claw_params',
    'k230_get_robot_set_pose_params',
    'k230_get_robot_move_params',
    'k230_get_robot_runAction_params',
    'k230_motor_speed_params',
    'k230_get_move_distance_params',
    'k230_get_arm_move_to_yz_params',
    'k230_face_detected',
    'k230_face_count',
    'k230_face_exists',
    'k230_face_recognition_get_arg_by_name',
    'k230_face2_detected',
    'k230_face2_count',
    'k230_result_face_pose_get_oriention',
    'k230_face2_near_center',
    'k230_face3_detected',
    'k230_face3_count',
    'k230_facial_detect',
    'k230_get_facial_args',
    'k230_gaze_detected',
    'k230_gaze_count',
    'k230_gaze_near_center_result',
    'k230_gaze_near_center',
    'k230_person_detected',
    'k230_person_count',
    'k230_person_near_center',
    'k230_person_point_detected',
    'k230_person2_count',
    'k230_person_keypoint_detect_name',
    'k230_result_person_keypoint_get_arg',
    'k230_person_keypoint_near_center',
    'k230_hand_detected',
    'k230_hand_count',
    'k230_hand_detected_posture',
    'k230_result_hand_keypoint_get_arg',
    'k230_hand_near_center',
    'k230_gesture_detected',
    'k230_gesture_count',
    'k230_result_hand_gesture_get_arg',
    'k230_result_hand_gesture_get_pos_arg_by_name',
    'k230_result_hand_gesture_get_pos_arg',
    'k230_fall_detected',
    'k230_fall_count',
    'k230_fall_near_center_result',
    'k230_fall_near_center',
    'k230_target_detected',
    'k230_target_near_center',
    'k230_dynamic_gesture_detected',
    'k230_result_dynamic_gesture_get_arg',
    'k230_result_self_learn_get_arg',
    'k230_result_self_learn_get_pos_arg',
    'k230_set_single_color',
    'k230_set_single_color_arg',
    'k230_single_color_detected',
    'k230_result_single_color_get_pos_arg',
    'k230_set_multi_color_arg',
    'k230_color_detected',
    'k230_color_count',
    'k230_color_near_center_name',
    'k230_color_near_center',
    'k230_result_multi_color_get_pos_arg',
    'k230_set_line_color',
    'k230_set_line_color_arg',
    'k230_line_detected',
    'k230_result_line_detect_get_arg',
    'k230_ocr_detected',
    'k230_ocr_count',
    'k230_result_ocr_get_arg',
    'k230_result_ocr_get_pos_arg',
    'k230_license_plate_detected',
    'k230_license_plate_count',
    'k230_result_lpr_get_arg',
    'k230_result_lpr_get_pos_arg',
    'k230_object_detected',
    'k230_object_count',
    'k230_object_classify_parameter',
    'k230_object_named_detected',
    'k230_object_parameter',
    'k230_trash_detected',
    'k230_trash_count',
    'k230_result_garbage_get_name_arg',
    'k230_trash_near_center',
    'k230_result_garbage_get_pos_arg',
    'k230_traffic_sign_detected',
    'k230_traffic_sign_count',
    'k230_result_traffic_get_name_arg',
    'k230_traffic_sign_near_center',
    'k230_april_tag_detected',
    'k230_april_tag_count',
    'k230_result_apriltag_get_name_arg',
    'k230_april_tag_near_center',
    'k230_result_apriltag_get_pos_arg',
    'k230_dm_code_detected',
    'k230_dm_code_count',
    'k230_result_dmcode_get_name_arg',
    'k230_dm_code_near_center',
    'k230_result_dmcode_get_pos_arg',
    'k230_qr_code_detected',
    'k230_qr_code_count',
    'k230_result_orcode_get_arg',
    'k230_qr_code_near_center',
    'k230_result_orcode_get_pos_arg',
    'k230_barcode_detected',
    'k230_barcode_count',
    'k230_result_barcode_get_arg',
    'k230_barcode_near_center',
    'k230_result_barcode_get_pos_arg',
    'aimech_wondercamInitI2c',
    'minihexa_wondercamInitI2c',
    'getFwVersion',
    'getFuncNumber',
    'getCurrentFunc',
    'switchFunc',
    'setLed',
    'wondercamUpdateResult',
    'isAnyFaceDetected',
    'numOfDetectedFaces'
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

// 产品主程序和共享输入模块同时参与查询，模拟用户实际搭建的同一条积木栈。
const getTemplate = blockType => {
    for (const extensionId of ['aihexa', 'sensor']) {
        const manifest = builtinProductManifests[extensionId];
        if (!blockType.startsWith(`${extensionId}_`)) continue;
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

describe('sensor built-in Mind+ snapshot', () => {
    test('keeps all migrated sensor batches and toolbox labels', () => {
        const manifest = builtinProductManifests.sensor;
        const extensionBlocks = manifestToExtensionObject(manifest).getInfo().blocks;

        expect(manifest).toMatchObject({
            id: 'sensor',
            name: '输入模块',
            version: '1.21.0',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks.map(block => block.opcode)).toEqual(EXPECTED_OPCODES);
        expect(Object.keys(manifest.menus)).toHaveLength(55);
        expect(manifest.categories.map(category => category.name)).toEqual([
            '旋钮', '光线传感器', '雨滴传感器', '土壤传感器', '声音传感器',
            '红外检测传感器', '触摸传感器', '按键模块', '超声波传感器',
            '颜色识别模块', '温湿度传感器', '六路巡线传感器',
            '四路巡线传感器', '旋钮四路巡线传感器', 'IMU传感器', 'LED超声波传感器',
            'WonderEcho语音模块', 'WonderLens视觉模块', 'K230视觉模块'
        ]);
        expect(extensionBlocks.filter(block => block && block.subCategory).map(block => block.subCategory))
            .toEqual(manifest.categories.map(category => category.name));
        manifest.blocks
            .filter(block => block.blockType === 'reporter' || block.blockType === 'boolean')
            .forEach(block => expect(block.disableMonitor).toBe(true));
    });

    test('keeps the legacy port menus and defaults', () => {
        const manifest = builtinProductManifests.sensor;

        expect(manifest.menus.aimech_iicport.items).toEqual([
            {text: 'A', value: '1'}, {text: 'B', value: '2'}, {text: 'C', value: '3'},
            {text: 'D', value: '4'}, {text: 'E', value: '5'}, {text: 'J', value: '9'},
            {text: 'K', value: '10'}
        ]);
        expect(manifest.menus.ultra_port.items).toEqual([
            {text: '2', value: '2'}, {text: '6', value: '6'}, {text: '8', value: '8'}
        ]);
        expect(manifest.menus.aiblocks_colors.items).toEqual([
            {text: '红', value: '1'}, {text: '绿', value: '2'}, {text: '蓝', value: '3'}
        ]);
        expect(manifest.menus.aiblocks_colors2.items).toEqual([
            {text: '红', value: '0'}, {text: '绿', value: '1'}, {text: '蓝', value: '2'}
        ]);
        expect(manifest.menus.temphumi.items).toEqual([
            {text: '温度', value: '0'}, {text: '湿度', value: '1'}
        ]);
        expect(manifest.menus.funcNum.items).toEqual([
            {text: '设置', value: '0'}, {text: '人脸识别', value: '1'},
            {text: '物体检测', value: '2'}, {text: '图像分类', value: '3'},
            {text: '特征学习', value: '4'}, {text: '颜色识别', value: '5'},
            {text: '视觉巡线', value: '6'}, {text: 'AprilTag', value: '7'},
            {text: '二维码', value: '8'}, {text: '条形码', value: '9'},
            {text: '数字', value: '10'}, {text: '地标', value: '11'}
        ]);
        expect(manifest.menus.onOff.items).toEqual([
            {text: '开', value: '1'}, {text: '关', value: '0'}
        ]);
        expect(manifest.menus.linefollows6Mask.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}, {text: '3', value: '4'},
            {text: '4', value: '8'}, {text: '5', value: '16'}, {text: '6', value: '32'}
        ]);
        expect(manifest.menus.linefollows6.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}, {text: '3', value: '3'},
            {text: '4', value: '4'}, {text: '5', value: '5'}, {text: '6', value: '6'}
        ]);
        expect(manifest.menus.linedot2.items).toEqual([
            {text: '◌', value: '0'}, {text: '●', value: '1'}
        ]);
        expect(manifest.menus.linefollows4Mask.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'},
            {text: '3', value: '4'}, {text: '4', value: '8'}
        ]);
        expect(manifest.menus.euler_element.items).toEqual([
            {text: 'Z轴转角', value: '0'},
            {text: 'X轴转角', value: '1'},
            {text: 'Y轴转角', value: '2'}
        ]);
        expect(manifest.menus.nums.items).toEqual([
            {text: '全部', value: '0'}, {text: '1', value: '1'}, {text: '2', value: '2'}
        ]);
        expect(manifest.menus.num.items).toEqual([
            {text: '1', value: '1'}, {text: '2', value: '2'}
        ]);
        expect(manifest.menus.rgb.items).toEqual([
            {text: '红', value: '1'}, {text: '绿', value: '2'}, {text: '蓝', value: '3'}
        ]);
        expect(manifest.menus.mechdog_word.items).toHaveLength(69);
        expect(manifest.menus.mechdog_word.items.slice(0, 4)).toEqual([
            {text: '前进', value: '1'}, {text: '后退', value: '2'},
            {text: '左转', value: '3'}, {text: '右转', value: '4'}
        ]);
        expect(manifest.menus.mechdog_word.items.slice(-2)).toEqual([
            {text: '检测到关闭播放', value: '0x7B'},
            {text: '分拣黄色', value: '0x7C'}
        ]);
        expect(manifest.menus.mechdog_speech_cmd_word.items).toHaveLength(23);
        expect(manifest.menus.mechdog_speech_cmd_word.items.slice(0, 2)).toEqual([
            {text: '正在前进', value: '1'}, {text: '正在后退', value: '2'}
        ]);
        expect(manifest.menus.mechdog_speech_play_word.items).toHaveLength(18);
        expect(manifest.menus.mechdog_speech_play_word.items.slice(-2)).toEqual([
            {text: '检测到前方物体超出范围，无法抓取', value: '0x11'},
            {text: '抓取结束', value: '0x12'}
        ]);
        expect(manifest.menus.k230_mode.items).toEqual([
            {text: '空模式', value: '0'}, {text: '在线大模型', value: '13'},
            {text: '人脸识别', value: '1'}, {text: '人脸姿态', value: '2'},
            {text: '表情识别', value: '3'}, {text: '注视方向', value: '4'},
            {text: '人体检测', value: '5'}, {text: '人体关键点', value: '6'},
            {text: '手部关键点', value: '7'}, {text: '手势识别', value: '8'},
            {text: '跌倒检测', value: '9'}, {text: '目标跟踪', value: '10'},
            {text: '动态手势', value: '11'}, {text: '自学习', value: '12'},
            {text: '单颜色检测', value: '14'}, {text: '多颜色检测', value: '15'},
            {text: '线检测', value: '16'}, {text: '文字识别', value: '18'},
            {text: '车牌识别', value: '19'}, {text: '物体分类', value: '20'},
            {text: '物体检测', value: '21'}, {text: '垃圾分类', value: '22'},
            {text: '交通检测', value: '23'}, {text: 'AprilTag识别', value: '24'},
            {text: 'DM码识别', value: '25'}, {text: '二维码识别', value: '26'},
            {text: '条形码识别', value: '27'}
        ]);
        expect(manifest.menus.k230_start.items).toEqual([
            {text: '启动', value: 'True'}, {text: '停止', value: 'False'}
        ]);
        expect(manifest.menus.facial_result.items).toEqual([
            {text: '高兴', value: 'Happiness'}, {text: '愤怒', value: 'Angry'},
            {text: '厌恶', value: 'Disgust'}, {text: '恐惧', value: 'Fear'},
            {text: '中性', value: 'Neutral'}, {text: '伤心', value: 'Sadness'},
            {text: '惊讶', value: 'Surprise'}
        ]);
        expect(manifest.menus.face_args.items).toEqual([
            {text: '名称', value: '0'}, {text: '置信度', value: '1'},
            {text: '中心X坐标', value: 'x'}, {text: '中心Y坐标', value: 'y'},
            {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.axis_result.items).toEqual([
            {text: '中心X坐标', value: 'x'}, {text: '中心Y坐标', value: 'y'},
            {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.person_keypoint_detect.items).toHaveLength(36);
        expect(manifest.menus.person_keypoint_detect.items.slice(0, 6)).toEqual([
            {text: '名称', value: 'id'}, {text: '置信度', value: 'score'},
            {text: '鼻子X坐标', value: '0'}, {text: '鼻子Y坐标', value: '1'},
            {text: '左眼X坐标', value: '2'}, {text: '左眼Y坐标', value: '3'}
        ]);
        expect(manifest.menus.person_keypoint_detect.items.slice(-4)).toEqual([
            {text: '左踝X坐标', value: '30'}, {text: '左踝Y坐标', value: '31'},
            {text: '右踝X坐标', value: '32'}, {text: '右踝Y坐标', value: '33'}
        ]);
        expect(manifest.menus.hand_menu.items).toHaveLength(48);
        expect(manifest.menus.hand_menu.items.slice(0, 10)).toEqual([
            {text: '名称', value: 'id'}, {text: '置信度', value: 'score'},
            {text: '中心X坐标', value: 'x'}, {text: '中心Y坐标', value: 'y'},
            {text: '宽度', value: 'w'}, {text: '高度', value: 'h'},
            {text: '手腕X坐标', value: '0'}, {text: '手腕Y坐标', value: '1'},
            {text: '拇指点1X坐标', value: '2'}, {text: '拇指点1Y坐标', value: '3'}
        ]);
        expect(manifest.menus.hand_menu.items.slice(-4)).toEqual([
            {text: '小指点3X坐标', value: '38'}, {text: '小指点3Y坐标', value: '39'},
            {text: '小指点4X坐标', value: '40'}, {text: '小指点4Y坐标', value: '41'}
        ]);
        expect(manifest.menus.hand_gesture.items).toEqual([
            {text: 'OK手势', value: 'ok'}, {text: '拳头', value: 'fist'},
            {text: '数字5', value: 'five'}, {text: '手枪', value: 'gun'},
            {text: '比心', value: 'love'}, {text: '数字1', value: 'one'},
            {text: '数字6', value: 'six'}, {text: '数字3', value: 'three'},
            {text: '点赞', value: 'thumbUp'}, {text: '胜利', value: 'yeah'}
        ]);
        expect(manifest.menus.face_args3.items).toEqual([
            {text: '名称', value: '0'}, {text: '中心X坐标', value: 'x'},
            {text: '中心Y坐标', value: 'y'}, {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.color_li.items).toEqual([
            {text: '红', value: 'red'}, {text: '绿', value: 'green'}, {text: '蓝', value: 'blue'},
            {text: '黑', value: 'black'}, {text: '白', value: 'white'}
        ]);
        expect(manifest.menus.color_angle_axis_result.items).toEqual([
            {text: '名称', value: 'color'}, {text: '角度', value: 'angle'},
            {text: '中心X坐标', value: 'cx'}, {text: '中心Y坐标', value: 'cy'},
            {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.line_result.items).toEqual([
            {text: '中心X坐标', value: 'center_pos'}, {text: '角度', value: 'angle'},
            {text: '颜色', value: 'color'}
        ]);
        expect(manifest.menus.ocr_point.items).toEqual([
            {text: '左上X', value: '0'}, {text: '左上Y', value: '1'},
            {text: '右上X', value: '2'}, {text: '右上Y', value: '3'},
            {text: '右下X', value: '4'}, {text: '右下Y', value: '5'},
            {text: '左下X', value: '6'}, {text: '左下Y', value: '7'}
        ]);
        expect(manifest.menus.obj_menu.items).toEqual([
            {text: '名称', value: '0'}, {text: '中心X坐标', value: 'x'}, {text: '中心Y坐标', value: 'y'}
        ]);
        expect(manifest.menus.objs.items).toHaveLength(80);
        expect(manifest.menus.objs.items.slice(0, 4)).toEqual([
            {text: '人', value: 'person'}, {text: '自行车', value: 'bicycle'},
            {text: '小汽车', value: 'car'}, {text: '摩托车', value: 'motorcycle'}
        ]);
        expect(manifest.menus.objs.items.slice(-4)).toEqual([
            {text: '剪刀', value: 'scissors'}, {text: '泰迪熊', value: 'teddy bear'},
            {text: '吹风机', value: 'hair drier'}, {text: '牙刷', value: 'toothbrush'}
        ]);
        expect(manifest.menus.garbage.items).toEqual([
            {text: '香蕉皮', value: 'BananaPeel'}, {text: '碎骨头', value: 'BrokenBones'},
            {text: '烟头', value: 'CigaretteEnd'}, {text: '一次性筷子', value: 'DisposableChopsticks'},
            {text: '番茄酱', value: 'Ketchup'}, {text: '记号笔', value: 'Marker'},
            {text: '口服液瓶', value: 'OralLiquidBottle'}, {text: '盘子', value: 'Plate'},
            {text: '塑料瓶', value: 'PlasticBottle'}, {text: '蓄电池', value: 'StorageBattery'},
            {text: '牙刷', value: 'Toothbrush'}, {text: '雨伞', value: 'Umbrella'}
        ]);
        expect(manifest.menus.traffic_sign.items).toEqual([
            {text: '前进', value: 'go'}, {text: '后退', value: 'back'},
            {text: '左转', value: 'Left'}, {text: '右转', value: 'Right'},
            {text: '停止', value: 'stop'}
        ]);
        expect(manifest.menus.buzzer_params.items).toEqual([
            {text: '蜂鸣器频率', value: 'freq'}, {text: '鸣响时间(ms)', value: 'time_count'}
        ]);
        expect(manifest.menus.rgb_light_params.items).toEqual([
            {text: '红色', value: 'red'}, {text: '绿色', value: 'green'}, {text: '蓝色', value: 'blue'}
        ]);
        expect(manifest.menus.arm_claw_params.items).toEqual([
            {text: '角度', value: 'angle'}
        ]);
        expect(manifest.menus.name_confidence.items).toEqual([
            {text: '文本', value: '0'}, {text: '置信度', value: '1'}
        ]);
        expect(manifest.menus.face_args2.items).toEqual([
            {text: '置信度', value: '1'}, {text: '中心X坐标', value: 'x'},
            {text: '中心Y坐标', value: 'y'}, {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.face2_args.items).toEqual([
            {text: '姿态', value: '0'}, {text: '置信度', value: '1'},
            {text: '翻滚角(roll)', value: '2'}, {text: '俯仰角(pitch)', value: '3'},
            {text: '偏航角(yaw)', value: '4'}, {text: '中心X坐标', value: 'x'},
            {text: '中心Y坐标', value: 'y'}, {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.face_pos_oriention.items).toEqual([
            {text: '前', value: 'Forward'}, {text: '下', value: 'Down'},
            {text: '左', value: 'Left'}, {text: '右', value: 'Right'}, {text: '未知', value: 'unknown'}
        ]);
        expect(manifest.menus.gaze_name.items).toEqual([
            {text: '上', value: 'Up'}, {text: '下', value: 'Down'},
            {text: '左', value: 'Left'}, {text: '右', value: 'Right'}, {text: '未知', value: 'unknow'}
        ]);
        expect(manifest.menus.gaze_result.items).toEqual([
            {text: '名称', value: '0'}, {text: '置信度', value: '1'},
            {text: '眼睛中心X坐标', value: '2'}, {text: '眼睛中心Y坐标', value: '3'},
            {text: '目标中心X坐标', value: '4'}, {text: '目标中心Y坐标', value: '5'},
            {text: '中心X坐标', value: 'x'}, {text: '中心Y坐标', value: 'y'},
            {text: '宽度', value: 'w'}, {text: '高度', value: 'h'}
        ]);
        expect(manifest.menus.linedot).toBeUndefined();
        expect(manifest.blocks.find(block => block.opcode === 'linefollower6_status').arguments.LINE)
            .toMatchObject({type: 'line6', scratchType: 'line6', defaultValue: '00'});
        expect(manifest.blocks.find(block => block.opcode === 'linefollower_status').arguments.LINE)
            .toMatchObject({type: 'line4', scratchType: 'line4', defaultValue: '00'});
        ['linefollower_status_result', 'linefollower4_status_result'].forEach(opcode => {
            expect(manifest.blocks.find(block => block.opcode === opcode).arguments.VALUE)
                .toMatchObject({type: 'line4', scratchType: 'line4', defaultValue: '00'});
        });
        expect(manifest.blocks.slice(0, 8).every(block => block.arguments.PORT.defaultValue === '1')).toBe(true);
        expect(manifest.blocks[8].arguments.ULTRA_PORT.defaultValue).toBe('2');
    });

    test('generates all nine legacy Python calls including dynamic port variable names', () => {
        const main = new TestBlock('aihexa_start_thread');
        const sensorBlocks = [
            new TestBlock('sensor_aimech_read_knob', {PORT: '1'}),
            new TestBlock('sensor_aimech_read_light', {PORT: '2'}),
            new TestBlock('sensor_aimech_get_rain_drop_value', {PORT: '3'}),
            new TestBlock('sensor_aimech_get_soil_value', {PORT: '4'}),
            new TestBlock('sensor_aimech_read_sound', {PORT: '5'}),
            new TestBlock('sensor_aimech_get_avoid_value', {PORT: '9'}),
            new TestBlock('sensor_aimech_read_touch', {PORT: '10'}),
            new TestBlock('sensor_aimech_key_is_pressed', {PORT: '1'}),
            new TestBlock('sensor_get_ultrasonic_distance', {ULTRA_PORT: '8'})
        ];
        sensorBlocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'knob = Hiwonder_DEV.DEV_KNOB(Hiwonder_DEV.Port(1))',
            'light = Hiwonder_DEV.DEV_LIGHT(Hiwonder_DEV.Port(2))',
            'rain = Hiwonder_DEV.DEV_RAIN(Hiwonder_DEV.Port(3))',
            'soil = Hiwonder_DEV.DEV_SOIL(Hiwonder_DEV.Port(4,0x5A))',
            'sound = Hiwonder_DEV.DEV_SOUND(Hiwonder_DEV.Port(5))',
            'ir_9 = Hiwonder_DEV.DEV_IR(Hiwonder_DEV.Port(9))',
            'touch = Hiwonder_DEV.DEV_TOUCH(Hiwonder_DEV.Port(10))',
            'key = Hiwonder_DEV.DEV_BUTTON(Hiwonder_DEV.Port(1))',
            'sonar_8 = Hiwonder.Sonar(Hiwonder.Port(8))',
            'ir_9.read_state()',
            'sonar_8.read()'
        ].forEach(line => expect(code).toContain(line));
        expect(code).toContain('import Hiwonder_DEV');
        expect(code).toContain('import Hiwonder');
    });

    test('generates the legacy color and temperature-humidity calls', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_colorsensor_init', {PORT: '2'}),
            new TestBlock('sensor_aiblocks_check_color', {COLOR: '3'}),
            new TestBlock('sensor_aiblocks_get_color'),
            new TestBlock('sensor_aiblocks_get_color_arg', {COLOR: '1'}, {
                NUM: new TestBlock('math_number', {NUM: 7})
            }),
            new TestBlock('sensor_aimech_temphumi_init', {PORT: '4'}),
            new TestBlock('sensor_aimech_get_temp_and_humi'),
            new TestBlock('sensor_aimech_get_temp_or_humi', {TEMPHUMI: '1'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'color = Hiwonder_DEV.DEV_COLOR_RECOGNIZE(Hiwonder_DEV.Port(2))',
            'color.get_color_name() == 3',
            'color.get_color_data()',
            '7[1]',
            'temphumi = Hiwonder_DEV.DEV_TH(Hiwonder_DEV.Port(4))',
            'temphumi.read_Temp_Humi()',
            'temphumi.read_Temp_Humi()[1]'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates the legacy six-line follower initialization, masks and readings', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_linefollower6_init', {PORT: '5'}),
            new TestBlock('sensor_linefollower6_one_status', {NUM: '8', LINE: '0'}),
            new TestBlock('sensor_linefollower6_one_status', {NUM: '32', LINE: '1'}),
            new TestBlock('sensor_linefollower6_status', {}, {
                LINE: new TestBlock('line6', {LINE6: '15'})
            }),
            new TestBlock('sensor_linefollower6_set_threshold', {}, {
                VALUE: new TestBlock('math_number', {NUM: 6})
            }),
            new TestBlock('sensor_linefollower6_get_value', {NUM: '6'}),
            new TestBlock('sensor_linefollower6_read_offset')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'linefollow6 = Hiwonder_DEV.DEV_LINE_FOLLOW_6(Hiwonder_DEV.Port(5))',
            '(linefollow6.get_result_data() & 8) == 0',
            '(linefollow6.get_result_data() & 32) > 0',
            'linefollow6.get_result_data() == 0x15',
            'linefollow6.set_ThresholdRatioReg(6)',
            'linefollow6.read_AnalogQuantity(6)',
            'linefollow6.read_offset()'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates both legacy four-line follower variants', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_linefollower_init', {PORT: '2'}),
            new TestBlock('sensor_linefollower_one_status', {NUM: '4', LINE: '1'}),
            new TestBlock('sensor_linefollower_status', {}, {
                LINE: new TestBlock('line4', {LINE4: '0f'})
            }),
            new TestBlock('sensor_linefollower_status_result', {}, {
                VALUE: new TestBlock('line4', {LINE4: '09'})
            }),
            new TestBlock('sensor_linefollower_read_offset'),
            new TestBlock('sensor_linefollower4_init', {PORT: '3'}),
            new TestBlock('sensor_linefollower4_one_status', {NUM: '8', LINE: '0'}),
            new TestBlock('sensor_linefollower4_status_result', {}, {
                VALUE: new TestBlock('line4', {LINE4: '0f'})
            }),
            new TestBlock('sensor_linefollower4_read_offset')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'linefollow = Hiwonder_DEV.DEV_LINE_FOLLOW_4(Hiwonder_DEV.Port(2))',
            '(linefollow.get_result_data() & 4) > 0',
            'linefollow.get_result_data() == 0x0f',
            'linefollow.get_result_data() == 0x09',
            'linefollow.read_offset()',
            'linefollow4 = Hiwonder_DEV.DEV_LINE_FOLLOW_4_O(Hiwonder_DEV.Port(3))',
            '(linefollow4.get_result_data() & 8) == 0',
            'linefollow4.get_result_data() == 0x0f',
            'linefollow4.read_offset()'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates the legacy external IMU initialization and Euler readings', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_imu_init', {PORT: '10'}),
            new TestBlock('sensor_get_euler_angle_element_value', {VALUE: '2'}),
            new TestBlock('sensor_get_euler_angle'),
            new TestBlock('sensor_get_euler_angle_element', {VALUE: '1'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'imu_sensor = Hiwonder_DEV.DEV_IMU(Hiwonder_DEV.Port(10))',
            'imu_sensor.read_euler()[2]',
            'imu_sensor.read_euler()'
        ].forEach(line => expect(code).toContain(line));
        expect(code).toContain('\n    1\n');
    });

    test('generates the legacy LED ultrasonic initialization, readings and light controls', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_led_ultrasonic_init', {PORT: '5'}),
            new TestBlock('sensor_aimech_get_led_ultrasonic_distance'),
            new TestBlock('sensor_aimech_set_led_ultrasonic_color', {NUMS: '0'}, {
                COLOR: new TestBlock('colour_picker', {COLOUR: '#ff8040'})
            }),
            new TestBlock('sensor_aimech_set_led_ultrasonic_color_arg', {NUMS: '2'}, {
                RED: new TestBlock('math_number', {NUM: 255}),
                GREEN: new TestBlock('math_number', {NUM: 128}),
                BLUE: new TestBlock('math_number', {NUM: 64})
            }),
            new TestBlock('sensor_aimech_close_led_ultrasonic', {NUMS: '1'}),
            new TestBlock('sensor_aimech_set_led_ultrasonic_breath', {NUM: '2', RGB: '3'}, {
                TIME: new TestBlock('math_number', {NUM: 1.5})
            }),
            new TestBlock('sensor_aimech_set_led_ultrasonic_random')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'sonar = Hiwonder_DEV.DEV_SONAR(Hiwonder_DEV.Port(5))',
            'sonar.getDistance()',
            'sonar.setRGB(0,0xff,0x80,0x40)',
            'sonar.setRGB(2,255,128,64)',
            'sonar.setRGB(1,0x00,0x00,0x00)',
            'sonar.setBreathingCycle(2,3,1.5 * 1000)',
            'sonar.startSymphony()'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates the legacy WonderEcho initialization, recognition and speech calls', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_wonderecho_init', {PORT: '9'}),
            new TestBlock('sensor_wonderecho_get_results'),
            new TestBlock('sensor_wonderecho_results', {WORD: '0x1A'}),
            new TestBlock('sensor_wonderecho_get_result_num'),
            new TestBlock('sensor_wonderecho_speech_cmd', {WORD: '3'}),
            new TestBlock('sensor_wonderecho_speech_cmd_number', {}, {
                NUM: new TestBlock('math_number', {NUM: 42})
            }),
            new TestBlock('sensor_wonderecho_speech_play', {WORD: '0x12'}),
            new TestBlock('sensor_wonderecho_speech_play_number', {}, {
                NUM: new TestBlock('math_number', {NUM: 18})
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'asr2 = Hiwonder_DEV.DEV_ASR(Hiwonder_DEV.Port(9))',
            'wonderecho_result = asr2.getResult()',
            '(wonderecho_result == 0x1A)',
            'wonderecho_result',
            'asr2.speak(asr2.ASR_CMDMAND, 3)',
            'asr2.speak(asr2.ASR_CMDMAND, 42)',
            'asr2.speak(asr2.ASR_ANNOUNCER, 0x12)',
            'asr2.speak(asr2.ASR_ANNOUNCER, 18)'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates WonderLens initialization, function selection and first face results', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_aimech_wondercamInitI2c', {IICPORT: '3'}),
            new TestBlock('sensor_getFwVersion'),
            new TestBlock('sensor_getFuncNumber', {NUM: '7'}),
            new TestBlock('sensor_getCurrentFunc'),
            new TestBlock('sensor_switchFunc', {NUM: '11'}),
            new TestBlock('sensor_setLed', {ONOFF: '0'}),
            new TestBlock('sensor_wondercamUpdateResult'),
            new TestBlock('sensor_isAnyFaceDetected'),
            new TestBlock('sensor_numOfDetectedFaces')
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'cam = Hiwonder_DEV.WonderCam(Hiwonder_DEV.Port(3))',
            'cam.getFwVersion()',
            'cam.AprilTag',
            'cam.getCurrentFunc()',
            'cam.switchFunc(cam.LandmarkRecognition)',
            'cam.setLed(cam.LED_OFF)',
            'cam.updateResult()',
            'cam.isAnyFaceDetected()',
            'cam.numOfDetectedFaces()'
        ].forEach(line => expect(code).toContain(line));
        expect(code).toContain('import Hiwonder_DEV');

        const miniMain = new TestBlock('aihexa_start_thread');
        miniMain.next = new TestBlock('sensor_minihexa_wondercamInitI2c');
        const miniCode = generatePythonCode(createWorkspace([miniMain]), {getPythonCodegenTemplate: getTemplate});
        expect(miniCode).toContain('cam = Hiwonder_DEV.WonderCam()');
        expect(miniCode).not.toContain('Hiwonder_DEV.Port(');
    });

    test('filters the WonderLens initializer to old products that support it', () => {
        const compose = productId => composeProductModuleManifest(
            builtinProductManifests.sensor,
            ['wonder-lens'],
            productId
        );
        const opcodes = productId => compose(productId).blocks.map(block => block.opcode);

        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa'].forEach(productId => {
            expect(opcodes(productId)).toContain('aimech_wondercamInitI2c');
            expect(opcodes(productId)).not.toContain('minihexa_wondercamInitI2c');
        });
        expect(opcodes('minihexa')).toContain('minihexa_wondercamInitI2c');
        expect(opcodes('minihexa')).not.toContain('aimech_wondercamInitI2c');
        expect(opcodes('aidoggy')).toEqual([]);
    });

    test('generates the legacy K230 initialization, controls and result communication', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_aimech_init', {PORT: '5'}),
            new TestBlock('sensor_k230_set_mode', {MODE: '13'}),
            new TestBlock('sensor_k230_set_run', {MODE: 'True'}),
            new TestBlock('sensor_k230_set_volumn', {}, {
                VALUE: new TestBlock('math_number', {NUM: 75})
            }),
            new TestBlock('sensor_k230_set_wifi', {}, {
                VALUE1: new TestBlock('text', {TEXT: 'MyWiFi'}),
                VALUE2: new TestBlock('text', {TEXT: 'secret'})
            }),
            new TestBlock('sensor_k230_update_detect_result'),
            new TestBlock('sensor_k230_result_exists'),
            new TestBlock('sensor_k230_get_result'),
            new TestBlock('sensor_k230_send_mcp_result', {}, {
                VALUE: new TestBlock('text', {TEXT: 'done'})
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'k230 = Hiwonder_DEV.DEV_K230(Hiwonder_DEV.Port(5))',
            'k230.set_mode(13)',
            'k230.set_run_enabled(True)',
            'k230.set_volumn(75)',
            'k230.set_wifi("MyWiFi","secret")',
            'k230.update_result()',
            'k230.result_available()',
            'k230.result_get()',
            'k230.send_mcp_result("done")',
            'time.sleep(0.05)'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 face recognition, pose and gaze result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_face_detected'),
            new TestBlock('sensor_k230_face_count'),
            new TestBlock('sensor_k230_face_exists', {}, {
                VALUE: new TestBlock('text', {TEXT: 'Alice'})
            }),
            new TestBlock('sensor_k230_face_recognition_get_arg_by_name', {POS: '1'}, {
                VALUE: new TestBlock('text', {TEXT: 'Alice'})
            }),
            new TestBlock('sensor_k230_face_recognition_get_arg_by_name', {POS: 'x'}, {
                VALUE: new TestBlock('text', {TEXT: 'Alice'})
            }),
            new TestBlock('sensor_k230_face2_detected'),
            new TestBlock('sensor_k230_face2_count'),
            new TestBlock('sensor_k230_result_face_pose_get_oriention', {ORIENTION: 'Left'}),
            new TestBlock('sensor_k230_face2_near_center', {VALUE: '3'}),
            new TestBlock('sensor_k230_face2_near_center', {VALUE: 'x'}),
            new TestBlock('sensor_k230_gaze_detected'),
            new TestBlock('sensor_k230_gaze_count'),
            new TestBlock('sensor_k230_gaze_near_center_result', {NAME: 'Up'}),
            new TestBlock('sensor_k230_gaze_near_center', {VALUE: '4'}),
            new TestBlock('sensor_k230_gaze_near_center', {VALUE: 'w'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        [
            'k230.result_available()',
            'k230.result_len()',
            'k230.find_result(\'extra\',"Alice")',
            'k230.get_key_result(\'extra\',"Alice",\'extra\',1)',
            'k230.get_key_result(\'extra\',"Alice",\'x\')',
            'k230.near_center_result(\'extra\',0) == \'Left\'',
            'k230.near_center_result(\'extra\',3)',
            'k230.near_center_result(\'x\')',
            'k230.near_center_result(\'extra\',0) == \'Up\'',
            'k230.near_center_result(\'extra\',4)',
            'k230.near_center_result(\'w\')'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 facial, person and person-keypoint result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_face3_detected'),
            new TestBlock('sensor_k230_face3_count'),
            new TestBlock('sensor_k230_facial_detect', {VALUE: 'Happiness'}),
            new TestBlock('sensor_k230_get_facial_args', {POS: '0'}),
            new TestBlock('sensor_k230_get_facial_args', {POS: 'x'}),
            new TestBlock('sensor_k230_person_detected'),
            new TestBlock('sensor_k230_person_count'),
            new TestBlock('sensor_k230_person_near_center', {VALUE: 'y'}),
            new TestBlock('sensor_k230_person_point_detected'),
            new TestBlock('sensor_k230_person2_count'),
            new TestBlock('sensor_k230_person_keypoint_detect_name', {}, {
                NAME: new TestBlock('text', {TEXT: 'Bob'})
            }),
            new TestBlock('sensor_k230_result_person_keypoint_get_arg', {POS: '17'}, {
                NAME: new TestBlock('text', {TEXT: 'Bob'})
            }),
            new TestBlock('sensor_k230_result_person_keypoint_get_arg', {POS: 'id'}, {
                NAME: new TestBlock('text', {TEXT: 'Bob'})
            }),
            new TestBlock('sensor_k230_person_keypoint_near_center', {POS: '33'}),
            new TestBlock('sensor_k230_person_keypoint_near_center', {POS: 'score'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(3);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(3);
        [
            'k230.result_available()',
            'k230.result_len()',
            "k230.near_center_result('extra',0) == 'Happiness'",
            "k230.near_center_result('extra',0)",
            "k230.near_center_result('x')",
            "k230.near_center_result('y')",
            "k230.find_result('id',\"Bob\")",
            "k230.get_key_result('id',\"Bob\",'keypoints',17)",
            "k230.get_key_result('id',\"Bob\",'id')",
            "k230.near_center_result('keypoints',33)",
            "k230.near_center_result('score')"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 hand-keypoint and gesture result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_hand_detected'),
            new TestBlock('sensor_k230_hand_count'),
            new TestBlock('sensor_k230_hand_detected_posture', {}, {
                NAME: new TestBlock('text', {TEXT: 'left-hand'})
            }),
            new TestBlock('sensor_k230_result_hand_keypoint_get_arg', {POS: '41'}, {
                NAME: new TestBlock('text', {TEXT: 'left-hand'})
            }),
            new TestBlock('sensor_k230_result_hand_keypoint_get_arg', {POS: 'score'}, {
                NAME: new TestBlock('text', {TEXT: 'left-hand'})
            }),
            new TestBlock('sensor_k230_hand_near_center', {VALUE: '40'}),
            new TestBlock('sensor_k230_hand_near_center', {VALUE: 'x'}),
            new TestBlock('sensor_k230_gesture_detected'),
            new TestBlock('sensor_k230_gesture_count'),
            new TestBlock('sensor_k230_result_hand_gesture_get_arg', {VALUE: 'thumbUp'}),
            new TestBlock('sensor_k230_result_hand_gesture_get_pos_arg_by_name', {NAME: 'fist', POS: 'h'}),
            new TestBlock('sensor_k230_result_hand_gesture_get_pos_arg', {POS: '0'}),
            new TestBlock('sensor_k230_result_hand_gesture_get_pos_arg', {POS: 'y'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(2);
        [
            "k230.find_result('id',\"left-hand\")",
            "k230.get_key_result('id',\"left-hand\",'keypoints',41)",
            "k230.get_key_result('id',\"left-hand\",'score')",
            "k230.near_center_result('keypoints',40)",
            "k230.near_center_result('x')",
            "k230.near_center_result('extra',0) == 'thumbUp'",
            "k230.get_key_result('extra','fist','h')",
            "k230.near_center_result('extra',0)",
            "k230.near_center_result('y')"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 fall, target, dynamic-gesture and self-learning result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_fall_detected'),
            new TestBlock('sensor_k230_fall_count'),
            new TestBlock('sensor_k230_fall_near_center_result'),
            new TestBlock('sensor_k230_fall_near_center', {VALUE: '1'}),
            new TestBlock('sensor_k230_fall_near_center', {VALUE: 'x'}),
            new TestBlock('sensor_k230_target_detected'),
            new TestBlock('sensor_k230_target_near_center', {VALUE: 'y'}),
            new TestBlock('sensor_k230_dynamic_gesture_detected'),
            new TestBlock('sensor_k230_result_dynamic_gesture_get_arg', {}, {
                GESTURE: new TestBlock('text', {TEXT: 'wave'})
            }),
            new TestBlock('sensor_k230_result_self_learn_get_arg', {}, {
                NAME: new TestBlock('text', {TEXT: 'scene-a'})
            }),
            new TestBlock('sensor_k230_result_self_learn_get_pos_arg', {POS: '1'}, {
                NAME: new TestBlock('text', {TEXT: 'scene-a'})
            }),
            new TestBlock('sensor_k230_result_self_learn_get_pos_arg', {POS: 'w'}, {
                NAME: new TestBlock('text', {TEXT: 'scene-a'})
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(3);
        [
            'k230.result_len()',
            "k230.near_center_result('extra',0) == 1",
            "k230.near_center_result('extra',1)",
            "k230.near_center_result('x')",
            "k230.near_center_result('y')",
            "k230.near_center_result('value') == \"wave\"",
            "k230.find_result('extra',\"scene-a\")",
            "k230.get_key_result('extra',\"scene-a\",'extra',1)",
            "k230.get_key_result('extra',\"scene-a\",'w')"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 single-color and multi-color configuration and result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_set_single_color', {COLOR: 'red'}),
            new TestBlock('sensor_k230_set_single_color_arg', {}, {
                COLOR: new TestBlock('text', {TEXT: '红'})
            }),
            new TestBlock('sensor_k230_single_color_detected'),
            new TestBlock('sensor_k230_result_single_color_get_pos_arg', {POS: 'color'}),
            new TestBlock('sensor_k230_result_single_color_get_pos_arg', {POS: 'cx'}),
            new TestBlock('sensor_k230_set_multi_color_arg', {}, {
                COLOR: new TestBlock('text', {TEXT: 'red,blue'})
            }),
            new TestBlock('sensor_k230_color_detected'),
            new TestBlock('sensor_k230_color_count'),
            new TestBlock('sensor_k230_color_near_center_name', {}, {
                NAME: new TestBlock('text', {TEXT: '绿'})
            }),
            new TestBlock('sensor_k230_color_near_center', {VALUE: 'color'}),
            new TestBlock('sensor_k230_color_near_center', {VALUE: 'angle'}),
            new TestBlock('sensor_k230_result_multi_color_get_pos_arg', {POS: 'color'}, {
                NAME: new TestBlock('text', {TEXT: '蓝'})
            }),
            new TestBlock('sensor_k230_result_multi_color_get_pos_arg', {POS: 'w'}, {
                NAME: new TestBlock('text', {TEXT: '蓝'})
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        [
            "k230.set_color_target('red')",
            "k230.near_center_result('color')",
            "k230.near_center_result('blobs',0,'cx')",
            'k230.set_multi_color_list("red,blue")',
            'k230.result_available()',
            'k230.result_len()',
            "k230.find_result('color','green')",
            "k230.near_center_result('blobs',0,'angle')",
            "k230.get_key_result('color','blue','color')",
            "k230.get_key_result('color','blue','blobs',0,'w')"
        ].forEach(line => expect(code).toContain(line));
        expect(code.match(/k230\.set_color_target\('red'\)/g)).toHaveLength(2);
    });

    test('generates K230 line, OCR and license-plate result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_set_line_color', {COLOR: 'black'}),
            new TestBlock('sensor_k230_set_line_color_arg', {}, {
                COLOR: new TestBlock('text', {TEXT: '红'})
            }),
            new TestBlock('sensor_k230_line_detected'),
            new TestBlock('sensor_k230_result_line_detect_get_arg', {VALUE: 'center_pos'}),
            new TestBlock('sensor_k230_result_line_detect_get_arg', {VALUE: 'color'}),
            new TestBlock('sensor_k230_ocr_detected'),
            new TestBlock('sensor_k230_ocr_count'),
            new TestBlock('sensor_k230_result_ocr_get_arg'),
            new TestBlock('sensor_k230_result_ocr_get_pos_arg', {POINT: '7'}),
            new TestBlock('sensor_k230_license_plate_detected'),
            new TestBlock('sensor_k230_license_plate_count'),
            new TestBlock('sensor_k230_result_lpr_get_arg'),
            new TestBlock('sensor_k230_result_lpr_get_pos_arg', {POINT: '2'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(3);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.near_center_result\('text'\)/g)).toHaveLength(2);
        [
            "k230.set_color_target('black')",
            'k230.set_color_target("红")',
            "k230.result_get(0,'center_pos')",
            "k230.result_get(0,'color')",
            "k230.near_center_result('points',7)",
            "k230.near_center_result('points',2)"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 object classification, object detection and trash result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_object_detected'),
            new TestBlock('sensor_k230_object_count'),
            new TestBlock('sensor_k230_object_classify_parameter', {POS: '0'}),
            new TestBlock('sensor_k230_object_classify_parameter', {POS: 'x'}),
            new TestBlock('sensor_k230_object_named_detected', {NAME: 'person'}),
            new TestBlock('sensor_k230_object_parameter', {POS: '1'}),
            new TestBlock('sensor_k230_object_parameter', {POS: 'h'}),
            new TestBlock('sensor_k230_trash_detected'),
            new TestBlock('sensor_k230_trash_count'),
            new TestBlock('sensor_k230_result_garbage_get_name_arg', {VALUE: 'BananaPeel'}),
            new TestBlock('sensor_k230_trash_near_center', {POS: '0'}),
            new TestBlock('sensor_k230_trash_near_center', {POS: '1'}),
            new TestBlock('sensor_k230_result_garbage_get_pos_arg', {POS: '7'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(2);
        [
            "k230.near_center_result('extra',0)",
            "k230.near_center_result('x')",
            "k230.find_result('extra','person')",
            "k230.near_center_result('extra',1)",
            "k230.near_center_result('h')",
            "k230.near_center_result('extra',0) == 'BananaPeel'",
            "k230.near_center_result('points',7)"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 traffic sign and AprilTag result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_traffic_sign_detected'),
            new TestBlock('sensor_k230_traffic_sign_count'),
            new TestBlock('sensor_k230_result_traffic_get_name_arg', {NAME: 'Left'}),
            new TestBlock('sensor_k230_traffic_sign_near_center', {POS: '0'}),
            new TestBlock('sensor_k230_traffic_sign_near_center', {POS: '1'}),
            new TestBlock('sensor_k230_traffic_sign_near_center', {POS: 'w'}),
            new TestBlock('sensor_k230_april_tag_detected'),
            new TestBlock('sensor_k230_april_tag_count'),
            new TestBlock('sensor_k230_result_apriltag_get_name_arg', {}, {
                NAME: new TestBlock('text', {TEXT: 'tag-7'})
            }),
            new TestBlock('sensor_k230_april_tag_near_center', {POS: '1'}),
            new TestBlock('sensor_k230_result_apriltag_get_pos_arg', {POS: '6'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(2);
        [
            "k230.near_center_result('extra',0) == 'Left'",
            "k230.near_center_result('extra',0)",
            "k230.near_center_result('extra',1)",
            "k230.near_center_result('w')",
            "k230.near_center_result('extra',0) == \"tag-7\"",
            "k230.near_center_result('points',6)"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 DM-code and QR-code result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_dm_code_detected'),
            new TestBlock('sensor_k230_dm_code_count'),
            new TestBlock('sensor_k230_result_dmcode_get_name_arg', {}, {
                NAME: new TestBlock('text', {TEXT: 'dm-1'})
            }),
            new TestBlock('sensor_k230_dm_code_near_center'),
            new TestBlock('sensor_k230_result_dmcode_get_pos_arg', {POS: '5'}),
            new TestBlock('sensor_k230_qr_code_detected'),
            new TestBlock('sensor_k230_qr_code_count'),
            new TestBlock('sensor_k230_result_orcode_get_arg', {}, {
                NAME: new TestBlock('text', {TEXT: 'qr-2'})
            }),
            new TestBlock('sensor_k230_qr_code_near_center'),
            new TestBlock('sensor_k230_result_orcode_get_pos_arg', {POS: 'y'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        expect(code.match(/k230\.result_available\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.result_len\(\)/g)).toHaveLength(2);
        expect(code.match(/k230\.near_center_result\('extra',0\)/g)).toHaveLength(4);
        [
            "k230.near_center_result('extra',0) == \"dm-1\"",
            "k230.near_center_result('points',5)",
            "k230.near_center_result('extra',0) == \"qr-2\"",
            "k230.near_center_result('y')"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 common MCP parameters and barcode result branches', () => {
        const main = new TestBlock('aihexa_start_thread');
        const resultInput = () => new TestBlock('text', {TEXT: 'result'});
        const blocks = [
            new TestBlock('sensor_k230_get_buzzer_params', {VALUE: 'time_count'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_rgb_light_params', {VALUE: 'red'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_sonar_rgb_params', {VALUE: 'green'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_arm_claw_params', {VALUE: 'angle'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_barcode_detected'),
            new TestBlock('sensor_k230_barcode_count'),
            new TestBlock('sensor_k230_result_barcode_get_arg', {}, {
                NAME: new TestBlock('text', {TEXT: 'code-3'})
            }),
            new TestBlock('sensor_k230_barcode_near_center'),
            new TestBlock('sensor_k230_result_barcode_get_pos_arg', {POS: 'h'})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        [
            '"result"[\'Buzzer_playTone\'][\'time_count\']',
            '"result"[\'RGB_setRGB\'][\'red\']',
            '"result"[\'sonar_setRGB\'][\'green\']',
            '"result"[\'arm_claw\'][\'angle\']',
            'k230.result_available()',
            'k230.result_len()',
            "k230.near_center_result('extra',0) == \"code-3\"",
            "k230.near_center_result('extra',0)",
            "k230.near_center_result('h')"
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates K230 MCP tool configuration variables', () => {
        const main = new TestBlock('aihexa_start_thread');
        const blocks = [
            new TestBlock('sensor_k230_mcp_action_setting', {}, {
                COMMAND: new TestBlock('text', {TEXT: '执行 动作'}),
                BLOCK: new TestBlock('math_number', {NUM: 5})
            }),
            new TestBlock('sensor_k230_mcp_move_setting', {}, {
                COMMAND: new TestBlock('text', {TEXT: '向前 移动'}),
                BLOCK: new TestBlock('math_number', {NUM: 6})
            }),
            new TestBlock('sensor_k230_mcp_setting', {}, {
                NAME: new TestBlock('text', {TEXT: 'custom_tool'}),
                COMMAND: new TestBlock('text', {TEXT: '自定义 工具'}),
                PARAMS: new TestBlock('text', {TEXT: '速度 参数'}),
                BLOCK: new TestBlock('math_number', {NUM: 7})
            })
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        [
            '_mcp_k230_run_action={"type":"function","function":{"name":"run_action",' +
                '"description":"\\"执行动作\\"","parameters":{"type":"object","properties":{"name":' +
                '{"type":"string","description":"要求执行的动作名称"}},"required":["name"]}},"block":5}',
            '_mcp_k230_move={"type":"function","function":{"name":"move",' +
                '"description":"\\"向前移动\\"","parameters":{"type":"object","properties":{' +
                '"x":{"type":"string","description":"x方向前进的距离, 单位m"},' +
                '"y":{"type":"string","description":"y方向前进的距离,单位m"}},' +
                '"required":["x","y"]}},"block":6}',
            '_mcp_k230_custom_tool={"type":"function","function":{"name":"custom_tool",' +
                '"description":"\\"自定义工具\\"","parameters":{"type":"object","properties":{' +
                '"params":"\\"速度参数\\""}}},"block":7}'
        ].forEach(line => expect(code).toContain(line));
    });

    test('filters K230 MCP result blocks and menus by product', () => {
        const compose = productId => composeProductModuleManifest(
            builtinProductManifests.sensor,
            ['k230-vision'],
            productId
        );
        const getBlock = (manifest, opcode) => manifest.blocks.find(block => block.opcode === opcode);

        const aimech = compose('aimech');
        expect(aimech.blocks.filter(block => block.opcode.endsWith('_set_mcp_default'))).toHaveLength(0);
        expect(getBlock(aimech, 'k230_get_default_mcp_name')).toBeUndefined();
        expect(getBlock(aimech, 'k230_get_robot_runAction_params')).toBeDefined();
        expect(getBlock(aimech, 'k230_get_arm_move_to_yz_params').arguments.VALUE.menu)
            .toBe('arm_move_to_yz_params');

        const mecanum = compose('aimecanum');
        expect(getBlock(mecanum, 'k230_aimecanum_set_mcp_default')).toBeDefined();
        expect(mecanum.blocks.filter(block => block.opcode.endsWith('_set_mcp_default'))).toHaveLength(1);
        expect(getBlock(mecanum, 'k230_get_default_mcp_name').arguments.VALUE.menu).toBe('mcp_names3');
        expect(getBlock(mecanum, 'k230_motor_speed_params')).toBeDefined();
        expect(getBlock(mecanum, 'k230_get_move_distance_params')).toBeDefined();
        expect(getBlock(mecanum, 'k230_get_robot_runAction_params')).toBeUndefined();
        expect(getBlock(mecanum, 'k230_get_arm_move_to_yz_params').arguments.VALUE.menu)
            .toBe('arm_move_to_yz_params2');

        const quadruped = compose('aiquadruped');
        expect(getBlock(quadruped, 'k230_aiquadruped_set_mcp_default')).toBeDefined();
        expect(quadruped.blocks.filter(block => block.opcode.endsWith('_set_mcp_default'))).toHaveLength(1);
        expect(getBlock(quadruped, 'k230_get_default_mcp_name').arguments.VALUE.menu).toBe('mcp_names2');
        expect(getBlock(quadruped, 'k230_get_robot_move_params').arguments.VALUE.menu)
            .toBe('robot_move_params2');
        expect(getBlock(quadruped, 'k230_get_robot_set_pose_params')).toBeUndefined();

        ['aiquadrupedpro', 'aihexa'].forEach(productId => {
            const manifest = compose(productId);
            expect(getBlock(manifest, `k230_${productId}_set_mcp_default`)).toBeDefined();
            expect(manifest.blocks.filter(block => block.opcode.endsWith('_set_mcp_default'))).toHaveLength(1);
            expect(getBlock(manifest, 'k230_get_default_mcp_name').arguments.VALUE.menu).toBe('mcp_names');
            expect(getBlock(manifest, 'k230_get_robot_set_pose_params')).toBeDefined();
            expect(getBlock(manifest, 'k230_get_robot_move_params').arguments.VALUE.menu)
                .toBe('robot_move_params');
        });
    });

    test('generates K230 product-specific MCP result parameters', () => {
        const main = new TestBlock('aihexa_start_thread');
        const resultInput = () => new TestBlock('text', {TEXT: 'result'});
        const blocks = [
            new TestBlock('sensor_k230_get_default_mcp_name', {VALUE: 'robot_move'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_robot_set_pose_params', {VALUE: 'pitch'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_robot_move_params', {VALUE: 'z'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_robot_runAction_params', {VALUE: 'count'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_motor_speed_params', {VALUE: 'right_front'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_move_distance_params', {VALUE: 'rpm'}, {RESULT: resultInput()}),
            new TestBlock('sensor_k230_get_arm_move_to_yz_params', {VALUE: 'y'}, {RESULT: resultInput()})
        ];
        blocks.reduce((previous, block) => {
            previous.next = block;
            return block;
        }, main);

        const code = generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        expect(code).not.toContain('# Unsupported block:');
        [
            '\'robot_move\' in "result"',
            '"result"[\'robot_set_pose\'][\'pitch\']',
            '"result"[\'robot_move\'][\'z\']',
            '"result"[\'robot_runAction\'][\'count\']',
            '"result"[\'mcar_set_motors_speed\'][\'right_front\']',
            '"result"[\'mcar_move_distance\'][\'rpm\']',
            '"result"[\'arm_move_to_yz\'][\'y\']'
        ].forEach(line => expect(code).toContain(line));
    });

    test('generates product-specific default MCP variable sets', () => {
        const generate = opcode => {
            const main = new TestBlock('aihexa_start_thread');
            main.next = new TestBlock(`sensor_${opcode}`);
            return generatePythonCode(createWorkspace([main]), {getPythonCodegenTemplate: getTemplate});
        };
        const variableNames = code => Array.from(code.matchAll(/^(_mcp_k230_[A-Za-z0-9_]+) = /gm), match => match[1]);

        const mecanum = generate('k230_aimecanum_set_mcp_default');
        expect(mecanum).not.toContain('# Unsupported block:');
        expect(variableNames(mecanum)).toEqual([
            '_mcp_k230_Bat_Battery_power', '_mcp_k230_Buzzer_playTone', '_mcp_k230_RGB_setRGB',
            '_mcp_k230_mcar_move_distance', '_mcp_k230_mcar_set_motors_speed',
            '_mcp_k230_arm_move_to_yz', '_mcp_k230_arm_claw',
            '_mcp_k230_sonar_getDistance', '_mcp_k230_sonar_setRGB'
        ]);
        expect(mecanum).toContain('需要平移运动时调用');

        const quadruped = generate('k230_aiquadruped_set_mcp_default');
        expect(variableNames(quadruped)).toEqual([
            '_mcp_k230_Bat_Battery_power', '_mcp_k230_Buzzer_playTone', '_mcp_k230_RGB_setRGB',
            '_mcp_k230_robot_move', '_mcp_k230_2dof_arm_move_to_yz', '_mcp_k230_arm_claw',
            '_mcp_k230_sonar_getDistance', '_mcp_k230_sonar_setRGB', '_mcp_k230_robot_runAction'
        ]);
        expect(quadruped).toContain('运动控制：0-前进，1-后退');

        const quadrupedPro = generate('k230_aiquadrupedpro_set_mcp_default');
        const hexa = generate('k230_aihexa_set_mcp_default');
        const proAndHexaVariables = [
            '_mcp_k230_Bat_Battery_power', '_mcp_k230_Buzzer_playTone', '_mcp_k230_RGB_setRGB',
            '_mcp_k230_robot_move', '_mcp_k230_2dof_arm_move_to_yz', '_mcp_k230_arm_claw',
            '_mcp_k230_sonar_getDistance', '_mcp_k230_sonar_setRGB',
            '_mcp_k230_robot_runAction', '_mcp_k230_robot_set_pose'
        ];
        expect(variableNames(quadrupedPro)).toEqual(proAndHexaVariables);
        expect(variableNames(hexa)).toEqual(proAndHexaVariables);
        expect(quadrupedPro).toContain('控制四足底盘运动时调用');
        expect(hexa).toContain('控制六足底盘运动时调用');
        [mecanum, quadruped, quadrupedPro, hexa].forEach(code => {
            expect(code).toContain('查询电量时调用，会返回电池电量');
        });
    });
});
