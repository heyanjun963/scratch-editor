import {fireEvent} from '@testing-library/react';
import React from 'react';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';

import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {MenuRefProvider} from '../../../src/contexts/menu-ref-context.jsx';
import SettingsMenu from '../../../src/components/menu-bar/settings-menu.jsx';

describe('SettingsMenu product options', () => {
    const renderMenu = () => {
        const store = configureStore()({
            locales: {
                isRtl: false,
                locale: 'en'
            },
            scratchGui: {
                settings: {
                    colorMode: 'default',
                    fontSize: 16,
                    theme: 'default'
                }
            }
        });
        return {
            store,
            ...renderWithIntl(
                <Provider store={store}>
                    <MenuRefProvider>
                        <SettingsMenu
                            canChangeColorMode
                            canChangeLanguage
                            canChangeTheme
                            depth={1}
                        />
                    </MenuRefProvider>
                </Provider>
            )
        };
    };

    beforeEach(() => {
        window.localStorage.clear();
    });

    test('shows language and font size without theme or color mode', () => {
        const {getByRole, getByText, queryByText} = renderMenu();
        fireEvent.click(getByRole('button', {name: 'Settings menu'}));

        expect(getByText('Language')).toBeTruthy();
        expect(getByText('Font Size')).toBeTruthy();
        expect(getByRole('button', {name: 'Font size menu'}).getAttribute('aria-expanded')).toBe('false');
        expect(queryByText('Theme')).toBeNull();
        expect(queryByText('Color Mode')).toBeNull();
    });

    test('opens the pixel input in a font size submenu', () => {
        const {getByRole} = renderMenu();
        fireEvent.click(getByRole('button', {name: 'Settings menu'}));
        const fontSizeMenu = getByRole('button', {name: 'Font size menu'});
        fireEvent.click(fontSizeMenu);

        const input = getByRole('spinbutton', {name: 'Font size in pixels'});
        expect(fontSizeMenu.getAttribute('aria-expanded')).toBe('true');
        expect(fontSizeMenu.closest('li').querySelector('ul input')).toBe(input);
        expect(input.value).toBe('16');
        expect(input.min).toBe('12');
        expect(input.max).toBe('24');
    });

    test('offers only English and Simplified Chinese', () => {
        const {getByRole, getByText, queryByText} = renderMenu();
        fireEvent.click(getByRole('button', {name: 'Settings menu'}));
        fireEvent.click(getByText('Language'));

        expect(getByText('English')).toBeTruthy();
        expect(getByText('简体中文')).toBeTruthy();
        expect(queryByText('Deutsch')).toBeNull();
        expect(queryByText('繁體中文')).toBeNull();
    });

    test('accepts and persists a specific pixel font size', () => {
        const {getByRole, store} = renderMenu();
        fireEvent.click(getByRole('button', {name: 'Settings menu'}));
        fireEvent.click(getByRole('button', {name: 'Font size menu'}));
        fireEvent.change(getByRole('spinbutton', {name: 'Font size in pixels'}), {
            target: {value: '19'}
        });

        expect(store.getActions()).toEqual([{
            type: 'scratch-gui/settings/SET_FONT_SIZE',
            fontSize: 19
        }]);
        expect(window.localStorage.getItem('scratchGuiFontSize')).toBe('19');
    });

    test('does not apply an out-of-range font size', () => {
        const {getByRole, store} = renderMenu();
        fireEvent.click(getByRole('button', {name: 'Settings menu'}));
        fireEvent.click(getByRole('button', {name: 'Font size menu'}));
        fireEvent.change(getByRole('spinbutton', {name: 'Font size in pixels'}), {
            target: {value: '25'}
        });

        expect(store.getActions()).toEqual([]);
        expect(window.localStorage.getItem('scratchGuiFontSize')).toBeNull();
    });
});
