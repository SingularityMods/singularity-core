import './SyncConfirmDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';

import { Row, Col } from 'react-bootstrap';

import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

class SyncConfirmDialog extends React.Component {
    constructor(props) {
        super(props);

    }

    render() {
        return (
            <div className="SyncConfirmDialog">
                <div className="up-notch"></div>
                <div className="sync-confirmation-dialog-content">
                    <Row className="sync-confirmation-dialog-exit">
                        <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                            <button className="menubar-btn" id="close-btn" onClick={this.props.exit}><i className="fas fa-times"></i></button>
                        </Col>
                    </Row>
                    <Row className="sync-confirmation-dialog-message">
                        <p>A sync profile already exists for this game verison. Do you want to use it or overwrite it?</p>
                        <p className="lastSyncTime">Profile last update - {this.props.cloudProfileLastSync}</p>
                    </Row>
                    <Row >
                        <Col xs={{span: 10, offset:2}} className="sync-confirmation-dialog-options">
                            <UpdateAddonButton
                                className="sync-confirmation-dialog-button"
                                type="Use"
                                handleClick={this.props.use}/>
                            <UpdateAddonButton
                                className="sync-confirmation-dialog-button"
                                type="Overwrite"
                                handleClick={this.props.overwrite} />
                        </Col>
                    </Row>
                </div>

            </div>
        )
    }
}

SyncConfirmDialog.propTypes = {
    cloudProfileLastSync: PropTypes.object,
    exit: PropTypes.func,
    overwrite: PropTypes.func,
    use: PropTypes.func
}

export default SyncConfirmDialog;

