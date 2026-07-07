const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');

const pythonWorkspaceDirName = 'python-workspaces';
const pythonVersionTimeout = 3000;
const pythonProbeTimeout = 3000;

// 非交互式 Python 运行器：把当前 tab 的生成代码写成 main.py，再用本机解释器执行。
class PythonRunner {
    constructor ({app}) {
        this.app = app;
        this.runningTabs = new Map();
        this.pythonCommandPromise = null;
    }

    // run 用于简单 stdout/stderr 捕获；需要 stdin 交互时由 TerminalRunner 接管。
    async run ({tabId, code, sender}) {
        if (!tabId) {
            throw new Error('Missing Python tab id.');
        }
        if (typeof code !== 'string') {
            throw new Error('Python code must be a string.');
        }
        if (this.runningTabs.has(tabId)) {
            throw new Error('Python is already running in this tab.');
        }

        const scriptPath = await this.writeMainFile(tabId, code);
        const pythonCommand = await this.resolvePythonCommand();
        const child = spawn(pythonCommand.command, [...pythonCommand.args, scriptPath], {
            cwd: path.dirname(scriptPath),
            env: Object.assign({}, process.env, {
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }),
            shell: false,
            windowsHide: true
        });

        this.runningTabs.set(tabId, {child, sender, scriptPath});

        // 输出事件带上 tabId，前端可以在多 tab 场景下只消费自己的进程输出。
        const sendOutput = (stream, chunk) => {
            if (!sender || sender.isDestroyed()) return;
            sender.send('python:output', {
                tabId,
                stream,
                text: chunk.toString('utf8')
            });
        };

        child.stdout.on('data', chunk => sendOutput('stdout', chunk));
        child.stderr.on('data', chunk => sendOutput('stderr', chunk));
        child.on('error', error => {
            sendOutput('stderr', `${error.message}\n`);
        });
        child.on('close', (exitCode, signal) => {
            this.runningTabs.delete(tabId);
            if (!sender || sender.isDestroyed()) return;
            sender.send('python:exit', {
                tabId,
                exitCode,
                signal,
                scriptPath
            });
        });

        return {
            tabId,
            scriptPath,
            python: `${pythonCommand.command} ${pythonCommand.args.join(' ')}`.trim()
        };
    }

    // 停止当前 tab 的非交互 Python 进程。
    stop (tabId) {
        const running = this.runningTabs.get(tabId);
        if (!running) {
            return {tabId, stopped: false};
        }
        running.child.kill();
        return {tabId, stopped: true};
    }

    // 应用退出或窗口关闭时清理所有残留 Python 进程。
    stopAll () {
        for (const tabId of this.runningTabs.keys()) {
            this.stop(tabId);
        }
    }

    // 给前端运行按钮和状态栏读取当前 tab 的运行状态。
    getStatus (tabId) {
        const running = this.runningTabs.get(tabId);
        return {
            tabId,
            running: Boolean(running),
            scriptPath: running ? running.scriptPath : null
        };
    }

    // 每个 tab 使用独立工作目录，避免多个编辑器同时运行时覆盖 main.py。
    getWorkspaceDir (tabId) {
        return path.join(this.app.getPath('userData'), pythonWorkspaceDirName, tabId);
    }

    // 写入真实 Python 文件，后续上传硬件时也可以复用这个落盘结果。
    async writeMainFile (tabId, code) {
        const workspaceDir = this.getWorkspaceDir(tabId);
        await fs.promises.mkdir(workspaceDir, {recursive: true});
        const scriptPath = path.join(workspaceDir, 'main.py');
        await fs.promises.writeFile(scriptPath, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
        return scriptPath;
    }

    // 解释器探测结果缓存起来，避免每次点击运行都重复扫 py/python3/python。
    resolvePythonCommand () {
        if (!this.pythonCommandPromise) {
            this.pythonCommandPromise = this.findPythonCommand();
        }
        return this.pythonCommandPromise;
    }

    // 优先使用用户显式配置，其次按平台尝试常见 Python 入口。
    async findPythonCommand () {
        const candidates = [];
        if (process.env.SCRATCH_DESKTOP_PYTHON) {
            candidates.push({
                command: process.env.SCRATCH_DESKTOP_PYTHON,
                args: []
            });
        }
        if (process.platform === 'win32') {
            candidates.push({
                command: 'py',
                args: ['-3']
            });
        }
        candidates.push(
            {command: 'python3', args: []},
            {command: 'python', args: []}
        );

        for (const candidate of candidates) {
            if (await this.canRunPython(candidate)) {
                return candidate;
            }
        }

        throw new Error('No Python interpreter was found. Install Python 3 or set SCRATCH_DESKTOP_PYTHON.');
    }

    // 用 --version 做轻量探测，超时视为不可用。
    canRunPython ({command, args}) {
        return new Promise(resolve => {
            const child = spawn(command, [...args, '--version'], {
                shell: false,
                windowsHide: true
            });
            const timer = setTimeout(() => {
                child.kill();
                resolve(false);
            }, pythonVersionTimeout);

            child.on('error', () => {
                clearTimeout(timer);
                resolve(false);
            });
            child.on('close', exitCode => {
                clearTimeout(timer);
                resolve(exitCode === 0);
            });
        });
    }

    // 给 TerminalRunner 使用：Windows 下需要把 py -3 解析成真实 python.exe。
    runPythonProbe ({command, args}, probeArgs) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, [...args, ...probeArgs], {
                shell: false,
                windowsHide: true
            });
            const chunks = [];
            const errors = [];
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error(`Python probe timed out for ${command}.`));
            }, pythonProbeTimeout);

            child.stdout.on('data', chunk => chunks.push(chunk));
            child.stderr.on('data', chunk => errors.push(chunk));
            child.on('error', error => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('close', exitCode => {
                clearTimeout(timer);
                if (exitCode !== 0) {
                    const message = Buffer.concat(errors).toString('utf8').trim();
                    reject(new Error(message || `Python probe failed for ${command}.`));
                    return;
                }
                resolve(Buffer.concat(chunks).toString('utf8').trim());
            });
        });
    }
}

module.exports = PythonRunner;
