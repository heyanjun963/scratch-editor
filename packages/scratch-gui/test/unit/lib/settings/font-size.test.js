import {
    DEFAULT_FONT_SIZE,
    MAX_FONT_SIZE,
    MIN_FONT_SIZE,
    isValidFontSize
} from '../../../../src/lib/settings/font-size';
import {detectFontSize, persistFontSize} from '../../../../src/lib/settings/font-size/persistence';

describe('font size settings', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('accepts each integer pixel value within the supported range', () => {
        expect(isValidFontSize(MIN_FONT_SIZE)).toBe(true);
        expect(isValidFontSize(19)).toBe(true);
        expect(isValidFontSize(MAX_FONT_SIZE)).toBe(true);
        expect(isValidFontSize(MIN_FONT_SIZE - 1)).toBe(false);
        expect(isValidFontSize(16.5)).toBe(false);
        expect(isValidFontSize(MAX_FONT_SIZE + 1)).toBe(false);
    });

    test('persists and detects a specific pixel value', () => {
        persistFontSize(19);
        expect(detectFontSize()).toBe(19);
    });

    test('uses the default for invalid persisted data', () => {
        window.localStorage.setItem('scratchGuiFontSize', 'invalid');
        expect(detectFontSize()).toBe(DEFAULT_FONT_SIZE);
    });

    test('rejects invalid values before persistence', () => {
        expect(() => persistFontSize(MAX_FONT_SIZE + 1)).toThrow('Invalid font size');
    });
});
