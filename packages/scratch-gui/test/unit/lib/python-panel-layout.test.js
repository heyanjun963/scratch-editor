import {
    clampPythonPanelWidth,
    getDefaultPythonPanelWidth
} from '../../../src/lib/python-panel-layout';

describe('Python panel layout', () => {
    test('uses 40 percent of the editor width by default', () => {
        expect(getDefaultPythonPanelWidth(1200, 8)).toBe(480);
    });

    test('keeps enough width for the blocks panel', () => {
        expect(clampPythonPanelWidth(1000, 800, 8)).toBe(512);
    });

    test('keeps enough width for the Python panel', () => {
        expect(clampPythonPanelWidth(1200, 200, 8)).toBe(400);
    });

    test('shrinks within the container when it is narrower than both minimums', () => {
        expect(clampPythonPanelWidth(360, 400, 8)).toBe(352);
    });
});
