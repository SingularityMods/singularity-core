import './ConfirmationDialog.css';

import * as React from 'react';
import { Row, Col } from 'react-bootstrap';

import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

export default class ConfirmationDialog extends React.Component {
    constructor(props) {
        super(props);

    }

    render() {
        return (
            <div className="ConfirmationDialog">
                <div className="confirmation-dialog-content">
                    <Row className="confirmation-dialog-exit">
                        <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                            <button className="menubar-btn" id="close-btn" onClick={this.props.reject}><i className="fas fa-times"></i></button>
                        </Col>
                    </Row>
                    <Row className="confirmation-dialog-title">
                        <Col xs={12}>
                            <h2>Are You Sure?</h2>
                        </Col>
                    </Row>
                    <Row className="confirmation-dialog-message">
                        {this.props.message}
                    </Row>
                    <Row className="confirmation-dialog-options">
                        <Col xs={12}>
                            <UpdateAddonButton
                                className="confirmation-dialog-button"
                                type="Confirm"
                                handleClick={this.props.accept}/>
                            <UpdateAddonButton
                                className="confirmation-dialog-button"
                                type="Cancel"
                                handleClick={this.props.reject} />
                        </Col>
                    </Row>
                </div>

            </div>
        )
    }
}