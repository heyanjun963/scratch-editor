import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import intlShape from '../../lib/intlShape.js';

import styles from './hello-scratch-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Hello Scratch',
        description: 'Title for the hello scratch modal',
        id: 'gui.helloScratchModal.title'
    }
});

const HelloScratchModal = props => (
    <Modal
        className={styles.modalContent}
        contentLabel={props.intl.formatMessage(messages.title)}
        id="helloScratchModal"
        onRequestClose={props.onRequestClose}
    >
        <Box className={styles.body}>
            <FormattedMessage
                defaultMessage="hello scratch"
                description="Message shown in the hello scratch modal"
                id="gui.helloScratchModal.message"
            />
        </Box>
    </Modal>
);

HelloScratchModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func.isRequired
};

export default injectIntl(HelloScratchModal);
