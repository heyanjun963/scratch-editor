import {TextDecoder as NodeTextDecoder, TextEncoder} from 'util';

import {startSerialOutputMonitor} from '../../../src/lib/serial-output-monitor';

const encode = text => new TextEncoder().encode(text);

describe('serial output monitor', () => {
    const originalTextDecoder = global.TextDecoder;
    const originalTextEncoder = global.TextEncoder;

    beforeAll(() => {
        global.TextDecoder = NodeTextDecoder;
        global.TextEncoder = TextEncoder;
    });

    afterAll(() => {
        global.TextDecoder = originalTextDecoder;
        global.TextEncoder = originalTextEncoder;
    });

    test('combines split chunks into complete lines and flushes trailing output', async () => {
        const reader = {
            cancel: jest.fn(),
            read: jest.fn()
                .mockResolvedValueOnce({done: false, value: encode('first\nsec')})
                .mockResolvedValueOnce({done: false, value: encode('ond\r\nlast')})
                .mockResolvedValueOnce({done: true}),
            releaseLock: jest.fn()
        };
        const onOutput = jest.fn();
        const monitor = startSerialOutputMonitor({
            readable: {
                getReader: () => reader
            }
        }, {onOutput});

        await monitor.done;

        expect(onOutput.mock.calls.map(call => call[0])).toEqual([
            'first\nsecond',
            'last'
        ]);
        expect(reader.releaseLock).toHaveBeenCalledTimes(1);
    });

    test('cancels an active reader before completing a requested stop', async () => {
        let finishRead;
        const reader = {
            cancel: jest.fn(() => {
                finishRead({done: true});
                return Promise.resolve();
            }),
            read: jest.fn(() => new Promise(resolve => {
                finishRead = resolve;
            })),
            releaseLock: jest.fn()
        };
        const monitor = startSerialOutputMonitor({
            readable: {
                getReader: () => reader
            }
        }, {onOutput: jest.fn()});

        await Promise.resolve();
        await monitor.stop();

        expect(reader.cancel).toHaveBeenCalledTimes(1);
        expect(reader.releaseLock).toHaveBeenCalledTimes(1);
    });

    test('temporarily routes bytes to an exclusive protocol reader', async () => {
        let finishRead;
        const reader = {
            cancel: jest.fn(() => {
                finishRead({done: true});
                return Promise.resolve();
            }),
            read: jest.fn(() => new Promise(resolve => {
                finishRead = resolve;
            })),
            releaseLock: jest.fn()
        };
        const writer = {
            releaseLock: jest.fn(),
            write: jest.fn(() => Promise.resolve())
        };
        const monitor = startSerialOutputMonitor({
            readable: {getReader: () => reader},
            writable: {getWriter: () => writer}
        }, {onOutput: jest.fn()});

        await Promise.resolve();
        const protocolResult = monitor.runProtocol(async protocol => {
            const responsePromise = protocol.readUntil('>');
            finishRead({done: false, value: encode('raw REPL>OK')});
            const response = await responsePromise;
            const ok = await protocol.readBytes(2);
            await protocol.write(encode('\x03'));
            return {
                ok: new NodeTextDecoder().decode(ok),
                response: new NodeTextDecoder().decode(response)
            };
        });

        await expect(protocolResult).resolves.toEqual({
            ok: 'OK',
            response: 'raw REPL>'
        });
        expect(Array.from(writer.write.mock.calls[0][0])).toEqual([0x03]);
        await monitor.stop();
    });
});
