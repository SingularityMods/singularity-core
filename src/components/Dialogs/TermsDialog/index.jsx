import './TermsDialog.css';

import {
  Container, Row, Col, Button,
} from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

function TermsDialog(props) {
  const {
    handleAccept,
    handleDecline,
    title,
    type,
    text,
  } = props;
  return (
    <Container className="TermsDialog">
      <div className="terms-dialog-container">
        <div className="terms-dialog-content">
          <Row className="terms-dialog-header">
            <Col xs={12}>
              <h1>{title}</h1>
            </Col>
          </Row>
          <Row className="terms-dialog-body">
            <div
              className="terms-body-text"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </Row>
          <Row className="terms-dialog-control">
            <Col xs={12}>
              <Button type="button" aria-label="Accept" id="accept-terms-button" className="terms-button" onClick={() => handleAccept(type)}>Accept</Button>
              <Button type="button" aria-label="Decline" className="terms-button" onClick={() => handleDecline(type)}>{type === 'telemetry' ? 'Decline' : 'Cancel'}</Button>
            </Col>
          </Row>
        </div>
      </div>
    </Container>
  );
}

TermsDialog.propTypes = {
  handleAccept: PropTypes.func.isRequired,
  handleDecline: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default TermsDialog;
