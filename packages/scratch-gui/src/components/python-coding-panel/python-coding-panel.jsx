import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';

import styles from './python-coding-panel.css';

const PythonCodingPanel = ({
    code,
    consoleText
}) => (
    <Box
        className={styles.pythonCodingPanel}
        element="section"
    >
        <Box className={styles.editorHeader}>
            <FormattedMessage
                defaultMessage="Python Code"
                description="Header for the Python coding mode code area"
                id="gui.pythonCoding.codeHeader"
            />
        </Box>
        <textarea
            readOnly
            className={styles.codeArea}
            spellCheck={false}
            value={code}
        />
        <Box className={styles.consoleHeader}>
            <FormattedMessage
                defaultMessage="Console"
                description="Header for the Python coding mode console area"
                id="gui.pythonCoding.consoleHeader"
            />
        </Box>
        <textarea
            readOnly
            className={styles.consoleArea}
            spellCheck={false}
            value={consoleText}
        />
    </Box>
);

PythonCodingPanel.propTypes = {
    code: PropTypes.string,
    consoleText: PropTypes.string
};

PythonCodingPanel.defaultProps = {
    code: '',
    consoleText: ''
};

export default PythonCodingPanel;
