import {builtinProductManifests} from '../../../../src/lib/custom-extension/builtin-product-manifests';
import {productExtensionCatalog} from '../../../../src/lib/custom-extension/product-extension-catalog';
import {
    clearProductModuleState,
    composeProductModuleManifest,
    getEnabledProductModuleIds,
    getLoadedMainProductId,
    isProductModuleSupported,
    setProductModuleState
} from '../../../../src/lib/custom-extension/product-module-support';

const FIRST_SENSOR_BATCH = [
    'knob',
    'light-sensor',
    'rain-sensor',
    'soil-sensor',
    'sound-sensor',
    'infrared-sensor',
    'touch-sensor',
    'button-module'
];

const SECOND_SENSOR_BATCH = ['color-sensor', 'temperature-humidity'];
const THIRD_SENSOR_BATCH = ['line-6'];
const FOURTH_SENSOR_BATCH = ['line-4', 'line-4-rotary'];
const FIFTH_SENSOR_BATCH = ['imu-sensor'];
const SIXTH_SENSOR_BATCH = ['led-ultrasonic'];
const SEVENTH_SENSOR_BATCH = ['wonder-echo'];
const PLANNED_SENSOR_MODULES = ['wonder-lens', 'wonder-mind'];
const EIGHTH_SENSOR_BATCH = ['k230-vision'];

const COMMON_AI_MODULES = {
    actuator: ['bus-servo', 'iic-pwm', 'fan'],
    xarm: ['xarm-series', 'xarm-linkage'],
    display: ['dot-matrix', 'rgb-module'],
    communication: ['communication']
};

const getProduct = productId => productExtensionCatalog
    .find(category => category.id === 'robots')
    .children.find(item => item.id === productId);

describe('product module support', () => {
    test('stores the module matrix declared by the old product library', () => {
        ['aimech', 'aimecanum', 'aiquadruped', 'aiquadrupedpro', 'aihexa'].forEach(productId => {
            const product = getProduct(productId);
            expect(product.modules.sensor)
                .toEqual(FIRST_SENSOR_BATCH.concat(
                    SECOND_SENSOR_BATCH,
                    THIRD_SENSOR_BATCH,
                    FOURTH_SENSOR_BATCH,
                    FIFTH_SENSOR_BATCH,
                    SIXTH_SENSOR_BATCH,
                    SEVENTH_SENSOR_BATCH,
                    PLANNED_SENSOR_MODULES,
                    EIGHTH_SENSOR_BATCH
                ));
            expect(product.modules.actuator).toEqual(COMMON_AI_MODULES.actuator);
            expect(product.modules.xarm).toEqual(productId === 'aimech' ?
                ['xarm', ...COMMON_AI_MODULES.xarm] : COMMON_AI_MODULES.xarm);
            expect(product.modules.display).toEqual(COMMON_AI_MODULES.display);
            expect(product.modules.communication).toEqual(COMMON_AI_MODULES.communication);
        });

        expect(getProduct('minihexa').modules).toEqual({
            sensor: ['infrared-sensor', 'led-ultrasonic', 'wonder-echo', 'wonder-lens']
        });
        expect(getProduct('aidoggy').modules).toEqual({
            sensor: ['temperature-humidity', 'led-ultrasonic'],
            actuator: COMMON_AI_MODULES.actuator,
            xarm: COMMON_AI_MODULES.xarm,
            display: ['dot-matrix'],
            communication: COMMON_AI_MODULES.communication
        });
    });

    test('requires a loaded product and checks its sensor support list', () => {
        const loaded = new Set(['aihexa']);
        const vm = {
            extensionManager: {
                isExtensionLoaded: extensionId => loaded.has(extensionId)
            }
        };

        expect(getLoadedMainProductId(vm)).toBe('aihexa');
        expect(isProductModuleSupported('aihexa', 'sensor', 'knob')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'line-6')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'line-4')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'imu-sensor')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'led-ultrasonic')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'wonder-echo')).toBe(true);
        expect(isProductModuleSupported('aihexa', 'sensor', 'k230-vision')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'line-4-rotary')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'imu-sensor')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'led-ultrasonic')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'wonder-echo')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'k230-vision')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'line-6')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'actuator', 'bus-servo')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'actuator', 'iic-pwm')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'actuator', 'fan')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'xarm', 'xarm-series')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'xarm', 'xarm-linkage')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'xarm', 'xarm')).toBe(false);
        expect(isProductModuleSupported('aiquadruped', 'display', 'dot-matrix')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'display', 'rgb-module')).toBe(true);
        expect(isProductModuleSupported('aiquadruped', 'communication', 'communication')).toBe(true);
        expect(isProductModuleSupported('minihexa', 'sensor', 'imu-sensor')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'sensor', 'led-ultrasonic')).toBe(true);
        expect(isProductModuleSupported('minihexa', 'sensor', 'wonder-echo')).toBe(true);
        expect(isProductModuleSupported('minihexa', 'sensor', 'k230-vision')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'sensor', 'knob')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'sensor', 'ultrasonic')).toBe(false);
        expect(isProductModuleSupported('aidoggy', 'sensor', 'temperature-humidity')).toBe(true);
        expect(isProductModuleSupported('aidoggy', 'sensor', 'led-ultrasonic')).toBe(true);
        expect(isProductModuleSupported('aidoggy', 'sensor', 'ultrasonic')).toBe(false);
        expect(isProductModuleSupported(null, 'sensor', 'ultrasonic')).toBe(false);
    });

    test('composes selected sensors into one ordered input module manifest', () => {
        const manifest = composeProductModuleManifest(
            builtinProductManifests.sensor,
            ['sound-sensor', 'knob']
        );

        expect(manifest.id).toBe('sensor');
        expect(manifest.categories.map(category => category.id)).toEqual(['sound-sensor', 'knob']);
        expect(manifest.blocks.map(block => block.opcode)).toEqual([
            'aimech_read_sound',
            'aimech_read_knob'
        ]);
        expect(Object.keys(manifest.menus)).toEqual(['aimech_iicport']);
    });

    test('filters product-specific blocks and their menus while composing a shared module', () => {
        const manifest = {
            id: 'sensor',
            categories: [{
                id: 'k230-vision',
                name: 'K230视觉模块',
                blocks: ['common', 'shared_variant', 'hexa_only', 'mecanum_only']
            }],
            blocks: [
                {opcode: 'common', products: [], arguments: {}},
                {
                    opcode: 'shared_variant',
                    products: ['aihexa', 'aimecanum'],
                    arguments: {VALUE: {menu: 'hexa_menu'}},
                    productArguments: {
                        aimecanum: {VALUE: {menu: 'mecanum_menu'}}
                    }
                },
                {
                    opcode: 'hexa_only',
                    products: ['aihexa'],
                    arguments: {VALUE: {menu: 'hexa_menu'}}
                },
                {
                    opcode: 'mecanum_only',
                    products: ['aimecanum'],
                    arguments: {VALUE: {menu: 'mecanum_menu'}}
                }
            ],
            menus: {
                hexa_menu: {items: ['hexapod']},
                mecanum_menu: {items: ['mecanum']}
            }
        };

        expect(composeProductModuleManifest(manifest, ['k230-vision'], 'aihexa').blocks.map(block => block.opcode))
            .toEqual(['common', 'shared_variant', 'hexa_only']);
        expect(Object.keys(composeProductModuleManifest(manifest, ['k230-vision'], 'aihexa').menus))
            .toEqual(['hexa_menu']);
        expect(composeProductModuleManifest(manifest, ['k230-vision'], 'aimecanum').blocks.map(block => block.opcode))
            .toEqual(['common', 'shared_variant', 'mecanum_only']);
        expect(composeProductModuleManifest(manifest, ['k230-vision'], 'aimecanum').blocks[1].arguments.VALUE.menu)
            .toBe('mecanum_menu');
        expect(composeProductModuleManifest(manifest, ['k230-vision']).blocks.map(block => block.opcode))
            .toEqual(['common']);
    });

    test('keeps selected module state scoped to one VM and clears it on product switch', () => {
        const vm = {};
        const otherVm = {};
        const manifest = composeProductModuleManifest(builtinProductManifests.sensor, ['knob']);

        setProductModuleState(vm, 'sensor', ['knob'], manifest);
        expect(getEnabledProductModuleIds(vm, 'sensor')).toEqual(['knob']);
        expect(getEnabledProductModuleIds(otherVm, 'sensor')).toEqual([]);

        expect(clearProductModuleState(vm, 'sensor')).toBe(manifest);
        expect(getEnabledProductModuleIds(vm, 'sensor')).toEqual([]);
    });
});
