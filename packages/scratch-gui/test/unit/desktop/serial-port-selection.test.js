const {selectPreferredSerialPort} = require('../../../../../desktop/serial-port-selection');

describe('desktop serial port selection', () => {
    const ports = [
        {portId: 'COM1', portName: 'COM1'},
        {portId: 'COM3', portName: 'COM3'}
    ];

    test('selects the requested port instead of the first candidate', () => {
        expect(selectPreferredSerialPort(ports, 'COM3')).toEqual(ports[1]);
    });

    test('falls back to the first candidate when the request is unavailable', () => {
        expect(selectPreferredSerialPort(ports, 'COM9')).toEqual(ports[0]);
    });
});
