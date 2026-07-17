// 串口候选只能从 Electron 本次提供的列表中选择，前端请求仅用于确定优先项。
const selectPreferredSerialPort = (ports, preferredPortId) => {
    if (!Array.isArray(ports) || !ports.length) return null;
    return ports.find(port => port.portId === preferredPortId) || ports[0];
};

module.exports = {
    selectPreferredSerialPort
};
