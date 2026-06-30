import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import SettingsMenu from './settings-menu.jsx';
import FileMenu from './file-menu.jsx';

import styles from './menu-bar.css';

const PythonMenuBar = ({
    ariaLabel,
    ariaRole,
    canChangeColorMode,
    canChangeLanguage,
    canChangeTheme,
    canCreateCopy,
    canManageFiles,
    canRemix,
    canSave,
    className,
    depth,
    getSaveToComputerHandler,
    handleClickNew,
    hasActiveMembership,
    isRtl,
    onClickRemix,
    onClickSave,
    onStartSelectingFileUpload,
    remixMessage
}) => (
    <Box
        className={classNames(
            className,
            styles.menuBar
        )}
        aria-label={ariaLabel}
        role={ariaRole}
        element="header"
    >
        <div className={styles.mainMenu}>
            <div className={styles.fileGroup}>
                {(canChangeColorMode || canChangeLanguage || canChangeTheme) && (
                    <SettingsMenu
                        canChangeLanguage={canChangeLanguage}
                        canChangeColorMode={canChangeColorMode}
                        canChangeTheme={canChangeTheme}
                        hasActiveMembership={hasActiveMembership}
                        isRtl={isRtl}
                        depth={depth}
                    />
                )}
                {canManageFiles && (
                    <FileMenu
                        onStartSelectingFileUpload={onStartSelectingFileUpload}
                        onClickNew={handleClickNew}
                        onClickRemix={onClickRemix}
                        onClickSave={onClickSave}
                        getSaveToComputerHandler={getSaveToComputerHandler}
                        canSave={canSave}
                        canCreateCopy={canCreateCopy}
                        canRemix={canRemix}
                        isRtl={isRtl}
                        remixMessage={remixMessage}
                        depth={depth}
                    />
                )}
            </div>
        </div>
    </Box>
);

PythonMenuBar.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    canChangeColorMode: PropTypes.bool,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    className: PropTypes.string,
    depth: PropTypes.number,
    getSaveToComputerHandler: PropTypes.func.isRequired,
    handleClickNew: PropTypes.func.isRequired,
    hasActiveMembership: PropTypes.bool,
    isRtl: PropTypes.bool,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    remixMessage: PropTypes.node
};

PythonMenuBar.defaultProps = {
    depth: 1
};

export default PythonMenuBar;
