const os = require('os');
const path = require('path');
const pty = require('node-pty');

const getExecutableProbeArgs = () => ['-c', 'import sys; print(sys.executable)'];

// 交互式终端运行器：通过 node-pty 执行 main.py，让 input()、实时输出和 Ctrl+C 类体验成立。
class TerminalRunner {
    constructor ({pythonRunner}) {
        this.pythonRunner = pythonRunner;
        this.sessions = new Map();
    }

    // 启动前会停止同 tab 旧会话，保证一个标签页只有一个活跃 PTY。
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

        // PTY 输出保持原始控制字符，前端 xterm 负责渲染颜色和光标行为。
        terminal.onData(data => {
            if (!sender || sender.isDestroyed()) return;
            sender.send('terminal:data', {
                tabId,
                data
            });
        });

        // 只处理当前 session 的退出事件，避免 stop 后旧事件误改新会话状态。
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

    // node-pty 在 Windows 上需要真实可执行文件，不能直接用 py -3 启动伪入口。
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

    // 把 xterm 输入写回 PTY，实现 input() 等交互。
    input (tabId, data) {
        const session = this.sessions.get(tabId);
        if (!session) return {tabId, written: false};
        session.terminal.write(String(data || ''));
        return {tabId, written: true};
    }

    // 前端容器变化时同步 PTY 尺寸，避免长输出换行和光标位置错乱。
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

    // 停止当前 tab 的 PTY 会话。
    stop (tabId) {
        const session = this.sessions.get(tabId);
        if (!session) return {tabId, stopped: false};
        session.terminal.kill();
        this.sessions.delete(tabId);
        return {tabId, stopped: true};
    }

    // 应用退出或关闭窗口时清理全部 PTY。
    stopAll () {
        for (const tabId of Array.from(this.sessions.keys())) {
            this.stop(tabId);
        }
    }

    // 给前端恢复运行状态使用，尤其是 tab 切换回来时。
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
