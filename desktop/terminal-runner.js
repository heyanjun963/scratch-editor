const os = require('os');
const path = require('path');
const pty = require('node-pty');

const getExecutableProbeArgs = () => ['-c', 'import sys; print(sys.executable)'];

class TerminalRunner {
    constructor ({pythonRunner}) {
        this.pythonRunner = pythonRunner;
        this.sessions = new Map();
    }

    async startPython ({tabId, code, sender, cols = 80, rows = 24}) {
        if (!tabId) {
            throw new Error('Missing terminal tab id.');
        }
        if (typeof code !== 'string') {
            throw new Error('Python code must be a string.');
        }
        this.stop(tabId);

        const scriptPath = await this.pythonRunner.writeMainFile(tabId, code);
        const pythonCommand = await this.resolvePtyPythonCommand();
        const cwd = path.dirname(scriptPath);
        const args = [...pythonCommand.args, scriptPath];

        const terminal = pty.spawn(pythonCommand.command, args, {
            cols,
            rows,
            cwd,
            env: Object.assign({}, process.env, {
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1',
                TERM: process.platform === 'win32' ? '' : 'xterm-256color'
            })
        });

        const session = {
            terminal,
            sender,
            scriptPath
        };
        this.sessions.set(tabId, session);

        terminal.onData(data => {
            if (!sender || sender.isDestroyed()) return;
            sender.send('terminal:data', {
                tabId,
                data
            });
        });

        terminal.onExit(event => {
            if (this.sessions.get(tabId) !== session) return;
            this.sessions.delete(tabId);
            if (!sender || sender.isDestroyed()) return;
            sender.send('terminal:exit', {
                tabId,
                exitCode: event.exitCode,
                signal: event.signal,
                scriptPath
            });
        });

        return {
            tabId,
            scriptPath,
            pid: terminal.pid,
            command: `${pythonCommand.command} ${args.join(' ')}`.trim()
        };
    }

    async resolvePtyPythonCommand () {
        const pythonCommand = await this.pythonRunner.resolvePythonCommand();
        if (process.platform !== 'win32') {
            return pythonCommand;
        }

        const executable = await this.pythonRunner.runPythonProbe(pythonCommand, getExecutableProbeArgs());
        if (!executable) {
            throw new Error('Python executable probe returned an empty path.');
        }

        return {
            command: executable,
            args: []
        };
    }

    input (tabId, data) {
        const session = this.sessions.get(tabId);
        if (!session) return {tabId, written: false};
        session.terminal.write(String(data || ''));
        return {tabId, written: true};
    }

    resize (tabId, {cols, rows} = {}) {
        const session = this.sessions.get(tabId);
        if (!session) return {tabId, resized: false};
        const nextCols = Math.max(2, Number(cols) || 80);
        const nextRows = Math.max(1, Number(rows) || 24);
        session.terminal.resize(nextCols, nextRows);
        return {
            tabId,
            resized: true,
            cols: nextCols,
            rows: nextRows
        };
    }

    stop (tabId) {
        const session = this.sessions.get(tabId);
        if (!session) return {tabId, stopped: false};
        session.terminal.kill();
        this.sessions.delete(tabId);
        return {tabId, stopped: true};
    }

    stopAll () {
        for (const tabId of Array.from(this.sessions.keys())) {
            this.stop(tabId);
        }
    }

    getStatus (tabId) {
        const session = this.sessions.get(tabId);
        return {
            tabId,
            running: Boolean(session),
            scriptPath: session ? session.scriptPath : null,
            platform: os.platform()
        };
    }
}

module.exports = TerminalRunner;
