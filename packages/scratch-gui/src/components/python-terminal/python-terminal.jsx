import {FitAddon} from '@xterm/addon-fit';
import {Terminal} from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import PropTypes from 'prop-types';
import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';

import Box from '../box/box.jsx';

import styles from './python-terminal.css';

// xterm 期望 CRLF，来自 Redux 或 Python stdout 的换行在这里统一规整。
const normalizeTerminalText = text => String(text || '').replace(/\r?\n/g, '\r\n');

// PythonTerminal 是展示组件，通过 imperative ref 给容器暴露 write/clear/fit。
const PythonTerminal = forwardRef(({
    onInput,
    onResize
}, ref) => {
    const hostRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(null);
    const inputHandlerRef = useRef(onInput);
    const resizeHandlerRef = useRef(onResize);
    const resizeObserverRef = useRef(null);

    useEffect(() => {
        inputHandlerRef.current = onInput;
    }, [onInput]);

    useEffect(() => {
        resizeHandlerRef.current = onResize;
    }, [onResize]);

    // fit 会把终端尺寸回传给容器，再同步到桌面端 PTY。
    const fit = () => {
        const fitAddon = fitAddonRef.current;
        const terminal = terminalRef.current;
        if (!fitAddon || !terminal) return;

        try {
            fitAddon.fit();
            if (resizeHandlerRef.current) {
                resizeHandlerRef.current({
                    cols: terminal.cols,
                    rows: terminal.rows
                });
            }
        } catch {
            // xterm can throw if fit runs before the DOM is measurable.
        }
    };

    // 容器不直接操作 xterm 实例，只使用这组受控方法。
    useImperativeHandle(ref, () => ({
        write: text => {
            if (terminalRef.current) {
                terminalRef.current.write(normalizeTerminalText(text));
            }
        },
        writeln: text => {
            if (terminalRef.current) {
                terminalRef.current.writeln(text);
            }
        },
        clear: () => {
            if (terminalRef.current) {
                terminalRef.current.clear();
            }
        },
        fit
    }));

    // xterm 只初始化一次，卸载时释放输入监听和 ResizeObserver。
    useEffect(() => {
        if (!hostRef.current) return undefined;

        const terminal = new Terminal({
            convertEol: true,
            cursorBlink: false,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 12,
            scrollback: 1000,
            theme: {
                background: '#111418',
                foreground: '#e6edf3',
                cursor: '#e6edf3',
                selectionBackground: '#3b526f'
            }
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(hostRef.current);
        const inputDisposable = terminal.onData(data => {
            if (inputHandlerRef.current) {
                inputHandlerRef.current(data);
            }
        });

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        requestAnimationFrame(fit);

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserverRef.current = new ResizeObserver(() => fit());
            resizeObserverRef.current.observe(hostRef.current);
        }
        window.addEventListener('resize', fit);

        return () => {
            window.removeEventListener('resize', fit);
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
            inputDisposable.dispose();
            terminal.dispose();
            terminalRef.current = null;
            fitAddonRef.current = null;
        };
    }, []);

    return (
        <Box className={styles.pythonTerminal}>
            <div
                className={styles.terminalHost}
                ref={hostRef}
            />
        </Box>
    );
});

PythonTerminal.displayName = 'PythonTerminal';

PythonTerminal.propTypes = {
    onInput: PropTypes.func,
    onResize: PropTypes.func
};

PythonTerminal.defaultProps = {
    onInput: null,
    onResize: null
};

export default PythonTerminal;
