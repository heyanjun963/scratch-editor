import {fireEvent, render} from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import {IntlProvider} from 'react-intl';

import PythonCodingPanel from '../../../src/components/python-coding-panel/python-coding-panel.jsx';
import {getConsoleTextDelta} from '../../../src/containers/python-coding-panel.jsx';

jest.mock('../../../src/components/python-terminal/python-terminal.jsx', () => {
    const MockPythonTerminal = () => <div data-testid="python-terminal" />;
    return MockPythonTerminal;
});

const renderPanel = () => render(
    <IntlProvider locale="en">
        <PythonCodingPanel
            code="print('ready')"
            desktopApiAvailable
        />
    </IntlProvider>
);

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
