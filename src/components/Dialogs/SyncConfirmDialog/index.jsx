import './SyncConfirmDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';

import { Row, Col } from 'react-bootstrap';
import { CSSTransition } from 'react-transition-group';

import UpdateAddonButton from '../../Buttons/UpdateAddonButton';

function SyncConfirmDialog(props) {
  const {
    cloudProfileLastSync,
    exit,
    overwrite,
    use,
  } = props;
  return (
    <CSSTransition
      in
      appear
      timeout={500}
      classNames="transition"
    >
      <div className="SyncConfirmDialog">
        <div className="up-notch" />
        <div className="sync-confirmation-dialog-content">
          <Row className="sync-confirmation-dialog-exit">
            <Col xs={{ span: 2, offset: 10 }} className="pull-right">
              <button
                type="button"
                aria-label="Close"
                className="menubar-btn"
                id="close-btn"
                onClick={exit}
              >
                <i className="fas fa-times" />
              </button>
            </Col>
          </Row>
          <Row className="sync-confirmation-dialog-message">
            <p>
              A sync profile already exists for this game verison.
              Do you want to use it or overwrite it?
            </p>
            <p className="lastSyncTime">
              Profile last update -
              {cloudProfileLastSync}
            </p>
          </Row>
          <Row>
            <Col xs={{ span: 10, offset: 2 }} className="sync-confirmation-dialog-options">
              <UpdateAddonButton
                className="sync-confirmation-dialog-button"
                type="Use"
                handleClick={use}
              />
              <UpdateAddonButton
                className="sync-confirmation-dialog-button"
                type="Overwrite"
                handleClick={overwrite}
              />
            </Col>
          </Row>
        </div>

      </div>
    </CSSTransition>
  );
}

SyncConfirmDialog.propTypes = {
  cloudProfileLastSync: PropTypes.string.isRequired,
  exit: PropTypes.func.isRequired,
  overwrite: PropTypes.func.isRequired,
  use: PropTypes.func.isRequired,
};

export default SyncConfirmDialog;
