const {spawn} = require('child_process');
const http = require('http');
const path = require('path');

const port = process.env.PORT || 8601;
const guiUrl = process.env.SCRATCH_DESKTOP_URL || `http://127.0.0.1:${port}/`;
const skipGuiServer = process.env.SCRATCH_DESKTOP_SKIP_GUI_SERVER === '1';

const log = message => console.log(`[desktop] ${message}`);

// 开发启动脚本会先等 webpack dev server 可访问，再拉起 Electron 窗口。
const waitForUrl = (url, timeoutMs = 60000) => new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
        const request = http.get(url, response => {
            response.resume();
            resolve();
        });

        request.on('error', error => {
            if (Date.now() - startedAt > timeoutMs) {
                reject(error);
                return;
            }
            setTimeout(attempt, 500);
        });

        request.setTimeout(2000, () => {
            request.destroy();
        });
    };

    attempt();
});

const getElectronBinary = () => {
    try {
        return require('electron');
    } catch {
        console.error('Electron is not installed. Run `npm install --save-dev electron@42.0.1` first.');
        process.exit(1);
    }
};

// 清掉 NODE_OPTIONS，避免 fnm/Codex 调试参数透传到子进程引起 Electron 启动异常。
const createChildEnv = extra => {
    const env = {
        ...process.env,
        ...extra
    };
    delete env.NODE_OPTIONS;
    return env;
};

const spawnChild = (command, args, options = {}) => spawn(command, args, {
    stdio: 'inherit',
    ...options
});

// 使用 node 直接执行 npm-cli，规避 Windows shell=true 拼接参数导致的 spawn EINVAL。
const startGuiServer = () => {
    if (skipGuiServer) {
        log('Skipping scratch-gui dev server because SCRATCH_DESKTOP_SKIP_GUI_SERVER=1');
        return null;
    }

    log(`Starting scratch-gui dev server on ${guiUrl}`);
    const npmCli = path.join(__dirname, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const child = spawnChild(process.execPath, [npmCli, '--workspace', '@scratch/scratch-gui', 'start'], {
        env: createChildEnv({
            PORT: String(port)
        })
    });
    child.on('exit', (code, signal) => {
        log(`scratch-gui dev server exited with code ${code} signal ${signal}`);
    });
    child.on('error', error => {
        console.error('[desktop] Failed to start scratch-gui dev server');
        console.error(error);
    });
    return child;
};

// Electron 子进程通过 SCRATCH_DESKTOP_URL 连接同一个 GUI dev server。
const startElectron = electronBinary => {
    log(`Starting Electron from ${electronBinary}`);
    const child = spawnChild(electronBinary, ['desktop/main.js'], {
        env: createChildEnv({
            ELECTRON_ENABLE_LOGGING: '1',
            SCRATCH_DESKTOP_URL: guiUrl
        })
    });
    child.on('error', error => {
        console.error('[desktop] Failed to start Electron');
        console.error(error);
    });
    return child;
};

// 一条命令启动桌面端：可选择自启 GUI server，也可复用外部已启动服务。
const main = async () => {
    const electronBinary = getElectronBinary();
    const guiServer = startGuiServer();

    try {
        log(`Waiting for ${guiUrl}`);
        await waitForUrl(guiUrl);
        log(`${guiUrl} is ready`);
    } catch (error) {
        console.error(`Timed out waiting for ${guiUrl}`);
        console.error(error);
        if (guiServer) guiServer.kill();
        process.exit(1);
    }

    const electron = startElectron(electronBinary);
    electron.on('exit', (code, signal) => {
        log(`Electron exited with code ${code} signal ${signal}`);
        if (guiServer) guiServer.kill();
        process.exit(code || 0);
    });
};

main();
