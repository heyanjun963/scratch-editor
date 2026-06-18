import {connect} from 'react-redux';

import HelloScratchModalComponent from '../components/hello-scratch-modal/hello-scratch-modal.jsx';
import {closeHelloScratchModal} from '../reducers/modals';

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeHelloScratchModal())
});

export default connect(
    null,
    mapDispatchToProps
)(HelloScratchModalComponent);
