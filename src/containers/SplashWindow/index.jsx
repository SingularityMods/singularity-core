import 'bootstrap/dist/css/bootstrap.css';
import '@fortawesome/fontawesome-free/js/all';

import '../../Themes.css';
import '../../Fonts.css';
import './SplashWindow.css';

import { hot } from 'react-hot-loader';
import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';

const { ipcRenderer } = require('electron');

class SplashWindow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      appState:'starting'
    };
  }

  render() {
    const {
      appState
    } = this.state;
    return (
      <Container className="Splash-Container">
        <Row>
          <Col xs={12} className="splash-window">
            <img src="../img/gifs/loading.gif" />
          </Col>
          <Col xs={12} className="splash-message">
            Loading App
          </Col>
        </Row>
      </Container>
    );
  }
}

// export default App;
export default hot(module)(SplashWindow);
