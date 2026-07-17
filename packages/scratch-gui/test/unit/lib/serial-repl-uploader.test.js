import {TextDecoder, TextEncoder} from 'util';

import {restartMicroPython, uploadMicroPythonFile} from '../../../src/lib/serial-repl-uploader';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encode = text => encoder.encode(text);

const createProtocol = ({
    expectedSize,
    leadingFriendlyPrompt = false,
    rawReplResponse = 'raw REPL; CTRL-B to exit\r\n>',
    rejectCommand = false
}) => {
    const stdoutResponses = ['', '', '', `${expectedSize}\r\n`];
    const readUntilResponses = [];
    stdoutResponses.forEach(stdout => {
        readUntilResponses.push(encode(`${stdout}\x04`));
        readUntilResponses.push(encode('\x04'));
        readUntilResponses.push(encode('>'));
    });
    let entryResponse = `${leadingFriendlyPrompt ? '>>>' : ''}${rawReplResponse}`;
    return {
        discardInput: jest.fn(() => Promise.resolve()),
        readBytes: jest.fn(() => Promise.resolve(encode(rejectCommand ? 'NO' : 'OK'))),
        readUntil: jest.fn(ending => {
            if (entryResponse !== null) {
                const endingText = typeof ending === 'string' ? ending : decoder.decode(ending);
                const endingOffset = entryResponse.indexOf(endingText);
                if (endingOffset === -1) {
                    const received = entryResponse;
                    entryResponse = null;
                    return Promise.reject(new Error(`等待串口响应 ${endingText} 超时，已收到: ${received}`));
                }
                const response = entryResponse.slice(0, endingOffset + endingText.length);
                entryResponse = entryResponse.slice(endingOffset + endingText.length);
                if (!entryResponse) entryResponse = null;
                return Promise.resolve(encode(response));
            }
            return Promise.resolve(readUntilResponses.shift());
        }),
        sleep: jest.fn(() => Promise.resolve()),
        write: jest.fn(() => Promise.resolve())
    };
};

describe('MicroPython serial uploader', () => {
    const originalTextDecoder = global.TextDecoder;
    const originalTextEncoder = global.TextEncoder;

    beforeAll(() => {
        global.TextDecoder = TextDecoder;
        global.TextEncoder = TextEncoder;
    });

    afterAll(() => {
        global.TextDecoder = originalTextDecoder;
        global.TextEncoder = originalTextEncoder;
    });

    test('enters Raw REPL without requiring a friendly prompt and verifies main.py size', async () => {
        const code = "print('uploaded')\n";
        const protocol = createProtocol({
            expectedSize: encode(code).byteLength
        });
        const session = {
            runProtocol: callback => callback(protocol),
            write: jest.fn(() => Promise.resolve())
        };

        await expect(uploadMicroPythonFile(session, code)).resolves.toEqual({
            bytes: encode(code).byteLength,
            fileName: 'main.py'
        });

        const writtenText = protocol.write.mock.calls
            .map(call => decoder.decode(call[0]))
            .join('\n');
        expect(decoder.decode(protocol.write.mock.calls[0][0])).toBe('\r\x02');
        expect(decoder.decode(protocol.write.mock.calls[1][0])).toBe('\r\x03\x03');
        expect(writtenText).toContain("open('main.py', 'wb')");
        expect(writtenText).toContain('f.write(');
        expect(writtenText).toContain("os.stat('main.py')[6]");
        expect(Array.from(session.write.mock.calls[0][0])).toEqual([0x04]);
        expect(protocol.readUntil.mock.calls.some(call => call[0] === '>>>')).toBe(false);
    });

    test('ignores a delayed friendly prompt before the Raw REPL banner', async () => {
        const code = "print('uploaded')\n";
        const protocol = createProtocol({
            expectedSize: encode(code).byteLength,
            leadingFriendlyPrompt: true
        });
        const session = {
            runProtocol: callback => callback(protocol),
            write: jest.fn(() => Promise.resolve())
        };

        await expect(uploadMicroPythonFile(session, code)).resolves.toEqual({
            bytes: encode(code).byteLength,
            fileName: 'main.py'
        });
    });

    test('rejects the upload when Raw REPL refuses a command', async () => {
        const protocol = createProtocol({expectedSize: 1, rejectCommand: true});
        const session = {
            runProtocol: callback => callback(protocol),
            write: jest.fn(() => Promise.resolve())
        };

        await expect(uploadMicroPythonFile(session, 'x')).rejects.toThrow('Raw REPL 执行被拒绝');
        expect(session.write).not.toHaveBeenCalled();
    });

    test('interrupts and soft-restarts MicroPython to produce fresh boot output', async () => {
        const session = {write: jest.fn(() => Promise.resolve())};

        await restartMicroPython(session, {delayMs: 0});

        expect(session.write.mock.calls.map(call => decoder.decode(call[0]))).toEqual([
            '\r\x02',
            '\r\x03\x03',
            '\x04'
        ]);
    });

    test('includes the actual device response when Raw REPL entry fails', async () => {
        const protocol = createProtocol({
            expectedSize: 1,
            rawReplResponse: 'friendly REPL >>>'
        });
        const session = {
            runProtocol: callback => callback(protocol),
            write: jest.fn(() => Promise.resolve())
        };

        await expect(uploadMicroPythonFile(session, 'x')).rejects.toThrow('friendly REPL');
    });
});
