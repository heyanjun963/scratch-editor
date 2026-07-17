import {TextDecoder as NodeTextDecoder, TextEncoder} from 'util';

import {fireEvent, render, waitFor} from '@testing-library/react';
import React, {useState} from 'react';
import {createIntl, IntlProvider} from 'react-intl';

import {PythonMenuBarComponent} from '../../../src/components/menu-bar/python-menu-bar.jsx';

describe('PythonMenuBar serial output', () => {
    const originalSerial = navigator.serial;
    const originalDesktopSerial = window.scratchDesktopSerial;
    const originalTextDecoder = global.TextDecoder;

    beforeAll(() => {
        global.TextDecoder = NodeTextDecoder;
    });

    afterEach(() => {
        Object.defineProperty(navigator, 'serial', {
            configurable: true,
            value: originalSerial
        });
        window.scratchDesktopSerial = originalDesktopSerial;
    });

    afterAll(() => {
        global.TextDecoder = originalTextDecoder;
    });

    test('writes connected hardware output and releases the reader before closing', async () => {
        let finishRead;
        const reader = {
            cancel: jest.fn(() => {
                finishRead({done: true});
                return Promise.resolve();
            }),
            read: jest.fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new TextEncoder().encode('device ready\n')
                })
                .mockImplementationOnce(() => new Promise(resolve => {
                    finishRead = resolve;
                })),
            releaseLock: jest.fn()
        };
        const port = {
            close: jest.fn(() => Promise.resolve()),
            getInfo: () => ({usbVendorId: 1234}),
            open: jest.fn(() => Promise.resolve()),
            readable: {getReader: () => reader},
            writable: {
                getWriter: () => ({
                    releaseLock: jest.fn(),
                    write: jest.fn(() => Promise.resolve())
                })
            }
        };
        Object.defineProperty(navigator, 'serial', {
            configurable: true,
            value: {requestPort: jest.fn(() => Promise.resolve(port))}
        });
        const selectSerialPort = jest.fn(() => Promise.resolve({ok: true}));
        window.scratchDesktopSerial = {
            isAvailable: jest.fn(() => Promise.resolve(true)),
            onPorts: jest.fn(() => jest.fn()),
            select: selectSerialPort
        };
        const onWriteConsoleLine = jest.fn();
        const intl = createIntl({locale: 'en'});

        const Harness = () => {
            const [serialBusy, setSerialBusy] = useState(false);
            const [serialConnected, setSerialConnected] = useState(false);
            return (
                <PythonMenuBarComponent
                    canChangeColorMode={false}
                    canChangeLanguage={false}
                    canChangeTheme={false}
                    canManageFiles={false}
                    getSaveToComputerHandler={jest.fn()}
                    handleClickNew={jest.fn()}
                    intl={intl}
                    pythonCode="print('ready')"
                    serialBaudRate={115200}
                    serialBusy={serialBusy}
                    serialConnected={serialConnected}
                    serialPortPath="COM3"
                    serialPorts={[]}
                    onSetSerialBaudRate={jest.fn()}
                    onSetSerialBusy={setSerialBusy}
                    onSetSerialConnected={setSerialConnected}
                    onSetSerialPortPath={jest.fn()}
                    onSetSerialPorts={jest.fn()}
                    onWriteConsoleLine={onWriteConsoleLine}
                />
            );
        };

        const {getByRole} = render(
            <IntlProvider locale="en">
                <Harness />
            </IntlProvider>
        );
        fireEvent.click(getByRole('button', {name: 'Connect'}));

        await waitFor(() => expect(selectSerialPort).toHaveBeenCalledWith('COM3'));
        await waitFor(() => expect(onWriteConsoleLine).toHaveBeenCalledWith('device ready'));
        fireEvent.click(getByRole('button', {name: 'Disconnect'}));

        await waitFor(() => expect(port.close).toHaveBeenCalledTimes(1));
        expect(reader.cancel).toHaveBeenCalledTimes(1);
        expect(reader.releaseLock).toHaveBeenCalledTimes(1);
        expect(reader.releaseLock.mock.invocationCallOrder[0]).toBeLessThan(port.close.mock.invocationCallOrder[0]);
    });
});
