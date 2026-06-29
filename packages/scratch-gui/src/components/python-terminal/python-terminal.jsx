import {FitAddon} from '@xterm/addon-fit';
import {Terminal} from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import PropTypes from 'prop-types';
import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';

import Box from '../box/box.jsx';

import styles from './python-terminal.css';

const normalizeTerminalText = text => String(text || '').replace(/\r?\n/g, '\r\n');

const PythonTerminal = forwardRef(({
    onResize
}, ref) => {
    const hostRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(null);
    const resizeObserverRef = useRef(null);

    const fit = () => {
        const fitAddon = fitAddonRef.current;
        const terminal = terminalRef.current;
        if (!fitAddon || !terminal) return;

        try {
            fitAddon.fit();
            if (onResize) {
                onResize({
                    cols: terminal.cols,
                    rows: terminal.rows
                });
            }
        } catch {
            // xterm can throw if fit runs before the DOM is measurable.
        }
    };

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
    onResize: PropTypes.func
};

PythonTerminal.defaultProps = {
    onResize: null
};

export default PythonTerminal;
