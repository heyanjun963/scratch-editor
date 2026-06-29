const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');

const pythonWorkspaceDirName = 'python-workspaces';
const pythonVersionTimeout = 3000;
const pythonProbeTimeout = 3000;

class PythonRunner {
    constructor ({app}) {
        this.app = app;
        this.runningTabs = new Map();
        this.pythonCommandPromise = null;
    }

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

    stop (tabId) {
        const running = this.runningTabs.get(tabId);
        if (!running) {
            return {tabId, stopped: false};
        }
        running.child.kill();
        return {tabId, stopped: true};
    }

    stopAll () {
        for (const tabId of this.runningTabs.keys()) {
            this.stop(tabId);
        }
    }

    getStatus (tabId) {
        const running = this.runningTabs.get(tabId);
        return {
            tabId,
            running: Boolean(running),
            scriptPath: running ? running.scriptPath : null
        };
    }

    getWorkspaceDir (tabId) {
        return path.join(this.app.getPath('userData'), pythonWorkspaceDirName, tabId);
    }

    async writeMainFile (tabId, code) {
        const workspaceDir = this.getWorkspaceDir(tabId);
        await fs.promises.mkdir(workspaceDir, {recursive: true});
        const scriptPath = path.join(workspaceDir, 'main.py');
        await fs.promises.writeFile(scriptPath, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
        return scriptPath;
    }

    resolvePythonCommand () {
        if (!this.pythonCommandPromise) {
            this.pythonCommandPromise = this.findPythonCommand();
        }
        return this.pythonCommandPromise;
    }

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
