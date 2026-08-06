// 桌面开发进程生命周期：直接管理 webpack/Electron 子进程，确保退出时释放开发端口。
const path = require('path');

const createGuiServerSpawnConfig = (workspaceRoot, port, env) => ({
    command: process.execPath,
    args: [
        path.join(workspaceRoot, 'node_modules', 'webpack', 'bin', 'webpack.js'),
        'serve'
    ],
    options: {
        cwd: path.join(workspaceRoot, 'packages', 'scratch-gui'),
        env: {
            ...env,
            PORT: String(port)
        }
    }
});

// 外部服务必须显式声明；普通启动检测到占用时拒绝复用未知内容。
const getGuiServerMode = (skipGuiServer, urlAvailable) => {
    if (skipGuiServer) return 'external';
    return urlAvailable ? 'occupied' : 'start';
};

// 只终止仍存活且由当前启动器持有的直接子进程。
const stopChildProcess = child => {
    if (!child || child.killed || child.exitCode !== null || child.signalCode !== null) return false;
    return child.kill();
};

// 多个退出来源共用同一次清理，防止 Electron exit 与控制台信号重复执行。
const createShutdownHandler = (getChildren, exit) => {
    let shuttingDown = false;
    return code => {
        if (shuttingDown) return;
        shuttingDown = true;
        getChildren().forEach(stopChildProcess);
        exit(code);
    };
};

module.exports = {
    createGuiServerSpawnConfig,
    createShutdownHandler,
    getGuiServerMode,
    stopChildProcess
};
