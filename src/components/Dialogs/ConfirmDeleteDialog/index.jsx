import './ConfirmDeleteDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import { CSSTransition } from 'react-transition-group';
import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

function ConfirmDeleteDialog(props) {
  const {
    accept,
    className,
    message,
    boldMessage,
    reject,
  } = props;
  return (
    <CSSTransition
      in
      appear
      timeout={300}
      classNames="transition"
    >
      <div className={`ConfirmDeleteDialog ${className}`}>
        <div className="left-notch" />
        <div className="right-notch" />
        <Row>
          <Col xs={12} className="confirm-delete-dialog-title">
            <h2>Confirm Uninstall</h2>
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
    </CSSTransition>
  );
}

ConfirmDeleteDialog.propTypes = {
  accept: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  boldMessage: PropTypes.string,
  reject: PropTypes.func.isRequired,
  className: PropTypes.any,
};

ConfirmDeleteDialog.defaultProps = {
  boldMessage: null,
  className: null,
};

export default ConfirmDeleteDialog;
