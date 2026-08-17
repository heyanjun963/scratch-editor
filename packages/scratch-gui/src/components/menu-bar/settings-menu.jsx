import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import {connect} from 'react-redux';
import useMenuNavigation from '../../hooks/use-menu-navigation';

import FontSizeMenu from './font-size-menu.jsx';
import LanguageMenu from './language-menu.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';

import {persistFontSize} from '../../lib/settings/font-size/persistence.js';
import {setFontSize} from '../../reducers/settings.js';

import menuBarStyles from './menu-bar.css';
import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import settingsIcon from './icon--settings.svg';

const settingsMenuAriaMessage = defineMessage({
    id: 'gui.aria.settingsMenu',
    defaultMessage: 'Settings menu',
    description: 'accessibility label for settings menu'
});

const SettingsMenu = ({
    canChangeLanguage,
    isRtl,
    fontSize,
    onChangeFontSize,
    depth
}) => {
    const intl = useIntl();

    const {
        isExpanded,
        handleOnOpen,
        handleOnClose,
        handleKeyDown,
        menuRef
    } = useMenuNavigation({
        depth,
        isRtl
    });

    return (<div
        className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
            [menuBarStyles.active]: isExpanded()
        })}
        aria-expanded={isExpanded()}
        aria-haspopup="menu"
        aria-label={intl.formatMessage(settingsMenuAriaMessage)}
        role="button"
        tabIndex={0}
        onClick={handleOnOpen}
        onKeyDown={handleKeyDown}
        ref={menuRef}
    >
        <img src={settingsIcon} />
        <span className={styles.dropdownLabel}>
            <FormattedMessage
                defaultMessage="Settings"
                description="Settings menu"
                id="gui.menuBar.settings"
            />
        </span>
        <img src={dropdownCaret} />
        <MenuBarMenu
            className={classNames(menuBarStyles.menuBarMenu, styles.brandMenu)}
            open={isExpanded()}
            place={isRtl ? 'left' : 'right'}
            onRequestClose={handleOnClose}
        >
            <MenuSection>
                {canChangeLanguage && <LanguageMenu depth={depth + 1} />}
                <FontSizeMenu
                    depth={depth + 1}
                    fontSize={fontSize}
                    isRtl={isRtl}
                    onChangeFontSize={onChangeFontSize}
                />
            </MenuSection>
        </MenuBarMenu>
    </div>);
};

SettingsMenu.propTypes = {
    canChangeLanguage: PropTypes.bool,
    isRtl: PropTypes.bool,
    fontSize: PropTypes.number,
    onChangeFontSize: PropTypes.func,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    fontSize: state.scratchGui.settings.fontSize,
    isRtl: state.locales.isRtl
});

const mapDispatchToProps = dispatch => ({
    onChangeFontSize: fontSize => {
        dispatch(setFontSize(fontSize));
        persistFontSize(fontSize);
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SettingsMenu);
