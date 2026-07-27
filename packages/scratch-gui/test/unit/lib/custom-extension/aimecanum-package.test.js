import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';

// AI 麦轮车内置默认版必须来自 0.2.3 MPEXT，并保留运动和六路巡线代码生成规则。
describe('AI mecanum built-in Mind+ snapshot', () => {
    test('loads the verified 0.2.3 package manifest', () => {
        const manifest = builtinProductManifests.aimecanum;

        expect(manifest).toMatchObject({
            id: 'aimecanum',
            name: 'AI机甲麦轮车',
            version: '0.2.3',
            package: {structure: 'mindplus-python-package-v1'}
        });
        expect(manifest.blocks).toHaveLength(59);
        expect(manifest.blocks.find(block => block.opcode === 'wait_seconds').codegen.python.template)
            .toBe('time.sleep({SECONDS})');
        expect(manifest.blocks.find(block => block.opcode === 'set_motor_speed_all').codegen.python)
            .toMatchObject({
                template: 'mecanumCar.set_motors_speed({SPEED4},{SPEED3},{SPEED2},{SPEED1})',
                imports: ['import Hiwonder_DEV'],
                variables: ['mecanumCar = Hiwonder_DEV.DEV_MecanumCar()']
            });
        expect(manifest.blocks.find(block => block.opcode === 'linefollower6_status').arguments.LINE)
            .toMatchObject({
                type: 'line6',
                scratchType: 'line6',
                defaultValue: '00'
            });
    });
});
