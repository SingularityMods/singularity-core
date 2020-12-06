import './TermsWindow.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
import SimpleBar from 'simplebar-react';

const scrollableNodeRef = React.createRef();

function TermsWindow(props) {
  scrollableNodeRef.current.scrollTop = 0;
  const {
    handleAccept,
    handleDecline,
    termType,
    text,
  } = props;
  let msg;
  if (termType === 'privacy') {
    msg = 'We Have a New Privacy Policy';
  } else if (termType === 'tos') {
    msg = 'We Have a New Terms of Service';
  }
  return (
    <Container className="TermsWindow">
      <div className="terms-window-container">
        <div className="terms-window-content">
          <Row className="terms-window-header">
            <Col xs={12}>
              <h1>{msg}</h1>
            </Col>
          </Row>
          <SimpleBar scrollableNodeProps={{ ref: scrollableNodeRef }} scrollbarMaxSize={50} className="terms-window-scrollbar">
            <Row className="terms-window-body">
              <div
                className="terms-body-text"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            </Row>
          </SimpleBar>

          <Row className="terms-window-contorl">
            <Col xs={12}>
              <button type="button" aria-label="Accept" id="accept-terms-button" className="terms-button" onClick={() => handleAccept(termType)}>Accept</button>
              <button type="button" aria-label="Decline" className="terms-button" onClick={handleDecline}>Cancel</button>
            </Col>
          </Row>
        </div>
      </div>
    </Container>
  );
}

TermsWindow.propTypes = {
  handleAccept: PropTypes.func.isRequired,
  handleDecline: PropTypes.func.isRequired,
  termType: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
};

export default TermsWindow;
