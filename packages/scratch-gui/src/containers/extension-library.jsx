import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from '@scratch/scratch-vm';
import {defineMessages, injectIntl} from 'react-intl';
import intlShape from '../lib/intlShape.js';

import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';
import {PYTHON_EDITOR_MODE} from '../reducers/mode';

import LibraryComponent from '../components/library/library.jsx';
import ProductExtensionLibrary from '../components/product-extension-library/product-extension-library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    },
    extensionUrl: {
        defaultMessage: 'Enter the URL of the extension',
        description: 'Prompt for unoffical extension url',
        id: 'gui.extensionLibrary.extensionUrl'
    }
});

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    // 原版拓展页的点击逻辑；Python 模式下作为内置 Scratch 拓展的兜底加载函数传给新页面。
    handleItemSelect (item) {
        const id = item.extensionId;
        let url = item.extensionURL ? item.extensionURL : id;
        if (!item.disabled && !id) {
            // eslint-disable-next-line no-alert
            url = prompt(this.props.intl.formatMessage(messages.extensionUrl));
        }
        if (id && !item.disabled) {
            if (this.props.vm.extensionManager.isExtensionLoaded(url)) {
                this.props.onCategorySelected(id);
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url).then(() => {
                    this.props.onCategorySelected(id);
                });
            }
        }
    }
    // Python 模式使用公司产品拓展库整页，其它模式仍走 Scratch 原版拓展库。
    render () {
        if (this.props.editorMode === PYTHON_EDITOR_MODE) {
            return (
                <ProductExtensionLibrary
                    onBuiltinExtensionSelect={this.handleItemSelect}
                    onCategorySelected={this.props.onCategorySelected}
                    onRequestClose={this.props.onRequestClose}
                />
            );
        }

        const extensionLibraryThumbnailData = extensionLibraryContent
            .filter(extension => !extension.modes || extension.modes.includes(this.props.editorMode))
            .map(extension => ({
                rawURL: extension.iconURL || extensionIcon,
                ...extension
            }));
        return (
            <LibraryComponent
                data={extensionLibraryThumbnailData}
                filterable={false}
                id="extensionLibrary"
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    editorMode: PropTypes.string,
    intl: intlShape.isRequired,
    onCategorySelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(ExtensionLibrary);
