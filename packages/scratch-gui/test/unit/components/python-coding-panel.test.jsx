import {fireEvent, render} from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import {IntlProvider} from 'react-intl';

import PythonCodingPanel from '../../../src/components/python-coding-panel/python-coding-panel.jsx';
import {downloadPythonCode, getConsoleTextDelta} from '../../../src/containers/python-coding-panel.jsx';

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

        expect(actionLabels.slice(0, 2)).toEqual(['Save', 'Run']);
        fireEvent.click(getByRole('button', {name: 'Save'}));
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    test('disables Save when generated code is empty', () => {
        const {getByRole} = renderPanel({code: '   ', onSave: jest.fn()});

        expect(getByRole('button', {name: 'Save'})).toBeDisabled();
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
