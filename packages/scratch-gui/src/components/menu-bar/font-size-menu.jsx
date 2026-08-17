// 字号子菜单负责编辑具体像素值，并将有效输入交给全局设置状态。
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessage, FormattedMessage, useIntl} from 'react-intl';

import {MenuItem, Submenu} from '../menu/menu.jsx';
import useMenuNavigation from '../../hooks/use-menu-navigation';
import {MAX_FONT_SIZE, MIN_FONT_SIZE, isValidFontSize} from '../../lib/settings/font-size/index.js';

import dropdownCaret from './dropdown-caret.svg';
import styles from './settings-menu.css';

const fontSizeMenuMessage = defineMessage({
    id: 'gui.aria.fontSizeMenu',
    defaultMessage: 'Font size menu',
    description: 'Accessibility label for the font size menu'
});

const fontSizeInputMessage = defineMessage({
    id: 'gui.menuBar.fontSizeInput',
    defaultMessage: 'Font size in pixels',
    description: 'Accessible label for the global font size input'
});

const FontSizeMenu = ({
    depth,
    fontSize,
    isRtl,
    onChangeFontSize
}) => {
    const intl = useIntl();
    const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));
    const fontSizeInputRef = useRef(null);

    useEffect(() => {
        setFontSizeInput(String(fontSize));
    }, [fontSize]);

    // 输入有效像素值时立即更新全局字号，编辑中间态在失焦时恢复。
    const handleFontSizeChange = useCallback(event => {
        const value = event.target.value;
        const nextFontSize = Number(value);
        setFontSizeInput(value);
        if (isValidFontSize(nextFontSize)) onChangeFontSize(nextFontSize);
    }, [onChangeFontSize]);

    const handleFontSizeBlur = useCallback(() => {
        if (!isValidFontSize(Number(fontSizeInput))) setFontSizeInput(String(fontSize));
    }, [fontSize, fontSizeInput]);

    const handleFontSizeInputKeyDown = useCallback(event => {
        if (event.key === 'Tab') return;
        event.stopPropagation();
        if (event.key === 'Enter') event.currentTarget.blur();
    }, []);

    const handleFontSizeItemClick = useCallback(() => {
        fontSizeInputRef.current?.focus();
    }, []);

    const handleFontSizeInputClick = useCallback(event => {
        event.stopPropagation();
    }, []);

    const {
        isExpanded,
        handleKeyDown,
        handleKeyDownOpenMenu,
        handleOnOpen,
        menuRef
    } = useMenuNavigation({
        depth: depth ?? 1,
        isRtl
    });

    return (
        <MenuItem
            ref={menuRef}
            isExpanded={isExpanded()}
            isDataMenuItemWrapper
            onKeyDown={handleKeyDown}
        >
            <button
                aria-expanded={isExpanded()}
                aria-haspopup="menu"
                aria-label={intl.formatMessage(fontSizeMenuMessage)}
                className={styles.option}
                data-menu-item
                onClick={handleOnOpen}
            >
                <span className={styles.fontSizeIcon}>Aa</span>
                <span className={styles.submenuLabel}>
                    <FormattedMessage
                        defaultMessage="Font Size"
                        description="Global interface font size setting"
                        id="gui.menuBar.fontSize"
                    />
                </span>
                <img
                    className={styles.expandCaret}
                    src={dropdownCaret}
                />
            </button>
            <Submenu
                place={isRtl ? 'left' : 'right'}
            >
                <MenuItem
                    className={styles.fontSizeInputItem}
                    isDataMenuItem
                    onClick={handleFontSizeItemClick}
                    onParentKeyDown={handleKeyDownOpenMenu}
                >
                    <label className={styles.fontSizeControl}>
                        <span className={styles.fontSizeIcon}>Aa</span>
                        <input
                            aria-label={intl.formatMessage(fontSizeInputMessage)}
                            className={styles.fontSizeInput}
                            max={MAX_FONT_SIZE}
                            min={MIN_FONT_SIZE}
                            ref={fontSizeInputRef}
                            step="1"
                            type="number"
                            value={fontSizeInput}
                            onBlur={handleFontSizeBlur}
                            onChange={handleFontSizeChange}
                            onClick={handleFontSizeInputClick}
                            onKeyDown={handleFontSizeInputKeyDown}
                        />
                        <span className={styles.fontSizeUnit}>px</span>
                    </label>
                </MenuItem>
            </Submenu>
        </MenuItem>
    );
};

FontSizeMenu.propTypes = {
    depth: PropTypes.number,
    fontSize: PropTypes.number.isRequired,
    isRtl: PropTypes.bool,
    onChangeFontSize: PropTypes.func.isRequired
};

export default FontSizeMenu;
