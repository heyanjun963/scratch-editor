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
    'button-module',
    'ultrasonic'
];

const SECOND_SENSOR_BATCH = ['color-sensor', 'temperature-humidity'];
const THIRD_SENSOR_BATCH = ['line-6'];
const FOURTH_SENSOR_BATCH = ['line-4', 'line-4-rotary'];

const getProduct = productId => productExtensionCatalog
    .find(category => category.id === 'robots')
    .children.find(item => item.id === productId);

describe('product module support', () => {
    test('stores migrated sensor batches on each supported product', () => {
        ['aimech', 'aiquadruped', 'aiquadrupedpro', 'aihexa'].forEach(productId => {
            expect(getProduct(productId).modules.sensor)
                .toEqual(FIRST_SENSOR_BATCH.concat(
                    SECOND_SENSOR_BATCH,
                    THIRD_SENSOR_BATCH,
                    FOURTH_SENSOR_BATCH
                ));
        });
        ['aimecanum'].forEach(productId => {
            expect(getProduct(productId).modules.sensor)
                .toEqual(FIRST_SENSOR_BATCH.concat(SECOND_SENSOR_BATCH, FOURTH_SENSOR_BATCH));
        });
        ['minihexa', 'aidoggy'].forEach(productId => {
            expect(getProduct(productId).modules.sensor).toEqual(['ultrasonic']);
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
        expect(isProductModuleSupported('aimecanum', 'sensor', 'line-4-rotary')).toBe(true);
        expect(isProductModuleSupported('aimecanum', 'sensor', 'line-6')).toBe(false);
        expect(isProductModuleSupported('minihexa', 'sensor', 'knob')).toBe(false);
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
