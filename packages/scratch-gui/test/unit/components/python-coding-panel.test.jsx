import {fireEvent, render} from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {TextDecoder, TextEncoder} from 'util';

import PythonCodingPanel from '../../../src/components/python-coding-panel/python-coding-panel.jsx';
import {downloadPythonCode, getConsoleTextDelta, readPythonFile} from '../../../src/containers/python-coding-panel.jsx';
import {tokenizePython} from '../../../src/components/python-coding-panel/python-syntax-highlight.jsx';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('../../../src/components/python-terminal/python-terminal.jsx', () => {
    const MockPythonTerminal = () => <div data-testid="python-terminal" />;
    return MockPythonTerminal;
});

const renderPanel = (props = {}) => render(
    <IntlProvider locale="en">
        <PythonCodingPanel
            code="print('ready')"
            desktopApiAvailable
            {...props}
        />
    </IntlProvider>
);

describe('PythonCodingPanel actions', () => {
    test('shows Save immediately before Run and saves non-empty code', () => {
        const onSave = jest.fn();
        const {getAllByRole, getByRole} = renderPanel({onSave});
        const actionLabels = getAllByRole('button').map(button => button.textContent);

        expect(actionLabels.slice(0, 3)).toEqual(['Load', 'Save', 'Run']);
        fireEvent.click(getByRole('button', {name: 'Save'}));
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    test('passes a selected Python file to the load callback', () => {
        const onLoad = jest.fn();
        const {getByLabelText} = renderPanel({onLoad});
        const file = {name: 'main.py', size: 12, arrayBuffer: () => Promise.resolve(new ArrayBuffer(12))};

        fireEvent.change(getByLabelText('Load Python file'), {target: {files: [file]}});

        expect(onLoad).toHaveBeenCalledWith(file);
    });

    test('shows the explicit switch back to blocks for loaded code', () => {
        const onUseBlocks = jest.fn();
        const {getByRole} = renderPanel({codeSource: 'loaded', onUseBlocks});

        fireEvent.click(getByRole('button', {name: 'Use blocks code'}));

        expect(onUseBlocks).toHaveBeenCalledTimes(1);
    });

    test('disables Save when generated code is empty', () => {
        const {getByRole} = renderPanel({code: '   ', onSave: jest.fn()});

        expect(getByRole('button', {name: 'Save'})).toBeDisabled();
    });
});

describe('Python syntax highlighting', () => {
    test('preserves source text while classifying Python tokens', () => {
        const code = '# 注释\ndef greet(name):\n    return print("hello", name, 42, True)\n';
        const tokens = tokenizePython(code);

        expect(tokens.map(token => token.value).join('')).toBe(code);
        expect(tokens.filter(token => token.type === 'comment').map(token => token.value)).toEqual(['# 注释']);
        expect(tokens.filter(token => token.type === 'keyword').map(token => token.value)).toEqual(['def', 'return']);
        expect(tokens.filter(token => token.type === 'string').map(token => token.value)).toEqual(['"hello"']);
        expect(tokens.filter(token => token.type === 'number').map(token => token.value)).toEqual(['42']);
        expect(tokens.filter(token => token.type === 'boolean').map(token => token.value)).toEqual(['True']);
        expect(tokens.filter(token => token.type === 'function').map(token => token.value)).toEqual(['greet']);
        expect(tokens.filter(token => token.type === 'builtin').map(token => token.value)).toEqual(['print']);
    });

    test('renders highlighted code without changing selectable text', () => {
        const code = 'value = "中文" # comment\n';
        const {getByTestId} = renderPanel({code});
        const codeElement = getByTestId('python-code');

        expect(codeElement.textContent).toBe(code);
        expect(codeElement.querySelector('[data-token-type="string"]')).toHaveTextContent('"中文"');
        expect(codeElement.querySelector('[data-token-type="comment"]')).toHaveTextContent('# comment');
    });

    test('keeps multiline strings in one string token', () => {
        const tokens = tokenizePython('text = """line 1\nline 2"""\n');

        expect(tokens.filter(token => token.type === 'string').map(token => token.value)).toEqual([
            '"""line 1\nline 2"""'
        ]);
    });

    test('falls back to plain tokens for an unterminated string', () => {
        const tokens = tokenizePython('print("unfinished\nreturn 1');

        expect(tokens.some(token => token.type === 'string')).toBe(false);
        expect(tokens.filter(token => token.type === 'keyword').map(token => token.value)).toEqual(['return']);
    });
});

describe('PythonCodingPanel console resizing', () => {
    test('changes console height while dragging the horizontal separator', () => {
        const {getByRole} = renderPanel();
        const panel = getByRole('region', {name: 'Python Code'});
        panel.getBoundingClientRect = () => ({
            bottom: 600,
            height: 600,
            top: 0
        });

        fireEvent.mouseDown(getByRole('separator'), {clientY: 400});
        fireEvent.mouseMove(document, {clientY: 300});
        fireEvent.mouseUp(document);

        expect(getByRole('group', {name: 'Console'})).toHaveStyle({height: '300px'});
    });

    test('keeps enough room for both the editor and console', () => {
        const {getByRole} = renderPanel();
        const panel = getByRole('region', {name: 'Python Code'});
        panel.getBoundingClientRect = () => ({
            bottom: 600,
            height: 600,
            top: 0
        });

        fireEvent.mouseDown(getByRole('separator'), {clientY: 400});
        fireEvent.mouseMove(document, {clientY: 0});

        expect(getByRole('group', {name: 'Console'})).toHaveStyle({height: '440px'});
    });

    test('supports keyboard height adjustment from the default size', () => {
        const {getByRole} = renderPanel();
        const panel = getByRole('region', {name: 'Python Code'});
        panel.getBoundingClientRect = () => ({
            bottom: 600,
            height: 600,
            top: 0
        });

        fireEvent.keyDown(getByRole('separator'), {key: 'ArrowUp'});

        expect(getByRole('group', {name: 'Console'})).toHaveStyle({height: '226px'});
    });
});

describe('Python console history synchronization', () => {
    test('writes only new text after Redux trims old console lines', () => {
        const previousText = 'line 1\nline 2\nline 3';
        const currentText = 'line 2\nline 3\nline 4';

        expect(getConsoleTextDelta(previousText, currentText)).toBe('line 4');
    });

    test('writes all text when there is no retained history overlap', () => {
        expect(getConsoleTextDelta('old output', 'new output')).toBe('new output');
    });
});

describe('Python code browser download', () => {
    test('reads UTF-8 Python files without parsing them', async () => {
        const bytes = new TextEncoder().encode('print("中文")\n');
        const code = await readPythonFile({
            size: bytes.byteLength,
            arrayBuffer: () => Promise.resolve(bytes.buffer)
        });

        expect(code).toBe('print("中文")\n');
    });

    test('rejects Python files larger than 5 MiB', async () => {
        await expect(readPythonFile({
            size: 5 * 1024 * 1024 + 1,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
        })).rejects.toThrow('larger than 5 MiB');
    });

    test('downloads generated code as a Python file and releases the object URL', () => {
        const createObjectURL = jest.fn(() => 'blob:python-code');
        const revokeObjectURL = jest.fn();
        const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        Object.defineProperty(URL, 'createObjectURL', {configurable: true, value: createObjectURL});
        Object.defineProperty(URL, 'revokeObjectURL', {configurable: true, value: revokeObjectURL});

        downloadPythonCode('print("browser")', 'demo.sb3');

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(click.mock.instances[0].download).toBe('demo.py');
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:python-code');
        click.mockRestore();
    });
});
