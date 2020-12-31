import './ConfirmDeleteDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

function ConfirmDeleteDialog(props) {
  const {
    accept,
    message,
    boldMessage,
    reject,
  } = props;
  return (
    <div className="ConfirmDeleteDialog">
      <div className="left-notch" />
      <div className="right-notch" />
      <Row>
        <Col xs={12} className="confirm-delete-dialog-title">
          <h2>Confirm Uninstall?</h2>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="confirm-delete-dialog-message">
          {message}
          <br />
          <span className="bold">{boldMessage}</span>
        </Col>
      </Row>
      <Row>
        <Col xs={{ span: 10, offset: 2 }} className="confirm-delete-dialog-options">
          <UpdateAddonButton
            className="confirm-delete-dialog-button"
            type="Confirm"
            handleClick={accept}
          />
          <UpdateAddonButton
            className="confirm-delete-dialog-button"
            type="Cancel"
            handleClick={reject}
          />
        </Col>
      </Row>
    </div>
  );
}

ConfirmDeleteDialog.propTypes = {
  accept: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  boldMessage: PropTypes.string,
  reject: PropTypes.func.isRequired,
};

ConfirmDeleteDialog.defaultProps = {
  boldMessage: null,
};

export default ConfirmDeleteDialog;
