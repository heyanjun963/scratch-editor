import reducer, {
    loadPythonCode,
    pythonCodingInitialState,
    setPythonCodeSource,
    updatePythonCode
} from '../../../src/reducers/python-coding';

describe('python coding reducer', () => {
    test('tracks loaded Python code separately from generated blocks code', () => {
        const loaded = reducer(pythonCodingInitialState, loadPythonCode('print("file")'));

        expect(loaded).toMatchObject({
            code: 'print("file")',
            codeSource: 'loaded'
        });
        expect(reducer(loaded, updatePythonCode('print("blocks")'))).toMatchObject({
            code: 'print("blocks")',
            codeSource: 'generated'
        });
    });

    test('allows an explicit switch back to generated blocks code', () => {
        const loaded = reducer(pythonCodingInitialState, loadPythonCode('print("file")'));

        expect(reducer(loaded, setPythonCodeSource('generated')).codeSource).toBe('generated');
    });
});
