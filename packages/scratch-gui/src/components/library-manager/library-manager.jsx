import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useRef, useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';

import intlShape from '../../lib/intlShape.js';
import Modal from '../modal/modal.jsx';

import styles from './library-manager.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Library Manager',
        description: 'Title for the custom library manager modal',
        id: 'gui.libraryManager.title'
    },
    importLibrary: {
        defaultMessage: 'Import Library',
        description: 'Side navigation item for importing a custom library',
        id: 'gui.libraryManager.importLibrary'
    },
    manageLibrary: {
        defaultMessage: 'Manage Libraries',
        description: 'Side navigation item for managing custom libraries',
        id: 'gui.libraryManager.manageLibrary'
    },
    mixlyTab: {
        defaultMessage: 'Mixly',
        description: 'Tab label for Mixly compatible libraries',
        id: 'gui.libraryManager.mixlyTab'
    },
    pythonTab: {
        defaultMessage: 'Python',
        description: 'Tab label for Python libraries',
        id: 'gui.libraryManager.pythonTab'
    },
    chooseFile: {
        defaultMessage: 'Choose File',
        description: 'Button label for choosing a custom library file',
        id: 'gui.libraryManager.chooseFile'
    },
    exportSelected: {
        defaultMessage: 'Export Selected',
        description: 'Button label for exporting the selected custom library',
        id: 'gui.libraryManager.exportSelected'
    },
    deleteSelected: {
        defaultMessage: 'Delete Selected',
        description: 'Button label for deleting the selected custom library',
        id: 'gui.libraryManager.deleteSelected'
    },
    status: {
        defaultMessage: 'Status',
        description: 'Table heading for custom library status',
        id: 'gui.libraryManager.status'
    },
    name: {
        defaultMessage: 'Name',
        description: 'Table heading for custom library name',
        id: 'gui.libraryManager.name'
    },
    version: {
        defaultMessage: 'Version',
        description: 'Table heading for custom library version',
        id: 'gui.libraryManager.version'
    },
    description: {
        defaultMessage: 'Description',
        description: 'Table heading for custom library description',
        id: 'gui.libraryManager.description'
    },
    enabled: {
        defaultMessage: 'Enabled',
        description: 'Status text for an enabled custom library',
        id: 'gui.libraryManager.enabled'
    },
    empty: {
        defaultMessage: 'No libraries installed.',
        description: 'Empty state for the custom library table',
        id: 'gui.libraryManager.empty'
    },
    importHint: {
        defaultMessage: 'Import a custom library package or manifest file.',
        description: 'Short hint shown in the import panel',
        id: 'gui.libraryManager.importHint'
    }
});

const getLibraryTarget = library => library.manifest.source || library.manifest.target || 'python';

// 旧版本地拓展库管理弹窗展示组件；新版整页拓展库已经内置同类能力。
const LibraryManagerComponent = ({
    installedLibraries,
    intl,
    onDeleteLibrary,
    onExportLibrary,
    onImportFile,
    onRequestClose
}) => {
    const fileInputRef = useRef(null);
    const [activeSection, setActiveSection] = useState('import');
    const [activeTab, setActiveTab] = useState('python');
    const [selectedLibraryId, setSelectedLibraryId] = useState('');
    const visibleLibraries = installedLibraries.filter(library => getLibraryTarget(library) === activeTab);
    const selectedLibrary = installedLibraries.find(library => library.manifest.id === selectedLibraryId);

    // 通过隐藏 input 触发系统文件选择，兼容浏览器和桌面端。
    const handleChooseFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // 导入后切到管理页，方便用户看到新库是否进入列表。
    const handleFileChange = event => {
        onImportFile(event);
        setActiveSection('manage');
    };

    return (
        <Modal
            className={styles.modal}
            contentLabel={intl.formatMessage(messages.title)}
            onRequestClose={onRequestClose}
        >
            <div className={styles.body}>
                <nav className={styles.sidebar}>
                    <button
                        className={classNames(styles.sideButton, {
                            [styles.sideButtonActive]: activeSection === 'import'
                        })}
                        type="button"
                        onClick={() => setActiveSection('import')}
                    >
                        <FormattedMessage {...messages.importLibrary} />
                    </button>
                    <button
                        className={classNames(styles.sideButton, {
                            [styles.sideButtonActive]: activeSection === 'manage'
                        })}
                        type="button"
                        onClick={() => setActiveSection('manage')}
                    >
                        <FormattedMessage {...messages.manageLibrary} />
                    </button>
                </nav>
                <section className={styles.content}>
                    <div className={styles.toolbar}>
                        <div className={styles.tabs}>
                            <button
                                className={classNames(styles.tab, {
                                    [styles.tabActive]: activeTab === 'mixly'
                                })}
                                type="button"
                                onClick={() => setActiveTab('mixly')}
                            >
                                <FormattedMessage {...messages.mixlyTab} />
                            </button>
                            <button
                                className={classNames(styles.tab, {
                                    [styles.tabActive]: activeTab === 'python'
                                })}
                                type="button"
                                onClick={() => setActiveTab('python')}
                            >
                                <FormattedMessage {...messages.pythonTab} />
                            </button>
                        </div>
                        <div className={styles.actions}>
                            <button
                                className={styles.actionButton}
                                type="button"
                                onClick={handleChooseFile}
                            >
                                <FormattedMessage {...messages.chooseFile} />
                            </button>
                            <button
                                className={classNames(styles.actionButton, styles.actionButtonSecondary)}
                                disabled={!selectedLibrary}
                                type="button"
                                onClick={() => onExportLibrary(selectedLibrary.manifest)}
                            >
                                <FormattedMessage {...messages.exportSelected} />
                            </button>
                            <button
                                className={classNames(styles.actionButton, styles.actionButtonSecondary)}
                                disabled={!selectedLibrary}
                                type="button"
                                onClick={() => {
                                    onDeleteLibrary(selectedLibrary.manifest);
                                    setSelectedLibraryId('');
                                }}
                            >
                                <FormattedMessage {...messages.deleteSelected} />
                            </button>
                        </div>
                    </div>
                    {activeSection === 'import' ? (
                        <div className={styles.empty}>
                            <p><FormattedMessage {...messages.importHint} /></p>
                            <button
                                className={styles.actionButton}
                                type="button"
                                onClick={handleChooseFile}
                            >
                                <FormattedMessage {...messages.chooseFile} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            {visibleLibraries.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th />
                                            <th><FormattedMessage {...messages.status} /></th>
                                            <th><FormattedMessage {...messages.name} /></th>
                                            <th><FormattedMessage {...messages.version} /></th>
                                            <th><FormattedMessage {...messages.description} /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleLibraries.map(library => {
                                            const manifest = library.manifest;
                                            return (
                                                <tr key={manifest.id}>
                                                    <td>
                                                        <input
                                                            checked={selectedLibraryId === manifest.id}
                                                            type="radio"
                                                            onChange={() => setSelectedLibraryId(manifest.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <span className={styles.status}>
                                                            <FormattedMessage {...messages.enabled} />
                                                        </span>
                                                    </td>
                                                    <td className={styles.nameCell}>{manifest.name}</td>
                                                    <td>{manifest.version}</td>
                                                    <td className={styles.descriptionCell}>
                                                        {manifest.description || intl.formatMessage(messages.enabled)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className={styles.empty}>
                                    <FormattedMessage {...messages.empty} />
                                </div>
                            )}
                        </div>
                    )}
                    <input
                        accept=".json,.sbext,.zip,application/json"
                        className={styles.hiddenInput}
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                    />
                </section>
            </div>
        </Modal>
    );
};

LibraryManagerComponent.propTypes = {
    installedLibraries: PropTypes.arrayOf(PropTypes.shape({
        manifest: PropTypes.shape({
            description: PropTypes.string,
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            source: PropTypes.string,
            target: PropTypes.string,
            version: PropTypes.string.isRequired
        }).isRequired
    })),
    intl: intlShape.isRequired,
    onDeleteLibrary: PropTypes.func.isRequired,
    onExportLibrary: PropTypes.func.isRequired,
    onImportFile: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired
};

LibraryManagerComponent.defaultProps = {
    installedLibraries: []
};

export default injectIntl(LibraryManagerComponent);
