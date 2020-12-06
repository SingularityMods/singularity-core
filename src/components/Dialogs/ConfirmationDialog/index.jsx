import './ConfirmationDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

function ConfirmationDialog(props) {
  const {
    accept,
    message,
    reject,
  } = props;
  return (
    <div className="ConfirmationDialog">
      <div className="confirmation-dialog-content">
        <Row className="confirmation-dialog-exit">
          <Col xs={{ span: 2, offset: 10 }} className="pull-right">
            <button type="button" aria-label="Close" className="menubar-btn" id="close-btn" onClick={reject}><i className="fas fa-times" /></button>
          </Col>
        </Row>
        <Row className="confirmation-dialog-title">
          <Col xs={12}>
            <h2>Are You Sure?</h2>
          </Col>
        </Row>
        <Row className="confirmation-dialog-message">
          {message}
        </Row>
        <Row className="confirmation-dialog-options">
          <Col xs={12}>
            <UpdateAddonButton
              className="confirmation-dialog-button"
              type="Confirm"
              handleClick={accept}
            />
            <UpdateAddonButton
              className="confirmation-dialog-button"
              type="Cancel"
              handleClick={reject}
            />
          </Col>
        </Row>
      </div>

    </div>
  );
}

ConfirmationDialog.propTypes = {
  accept: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  reject: PropTypes.func.isRequired,
};

export default ConfirmationDialog;
