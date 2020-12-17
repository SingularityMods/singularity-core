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
      state: 'starting',
      progress: '0%',
    };
    this.startupStateListener = this.startupStateListener.bind(this);
    this.getAppMessage = this.getAppMessage.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('startup-state', this.startupStateListener);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('startup-state', this.startupStateListener);
  }

  getAppMessage() {
    const { state, progress } = this.state;
    if (state === 'starting') {
      return 'Starting Singularity';
    } if (state === 'updating-app') {
      return 'Updating Singularity';
    } if (state === 'update-checking') {
      return 'Checking For Updates';
    } if (state === 'update-downloading') {
      return `Downloading Update ${progress}`;
    } if (state === 'update-installing') {
      return 'Installing Update';
    } if (state === 'update-pending') {
      return 'Installing Update';
    } if (state === 'error') {
      return 'Error...'
    }
    return 'Hang Tight...';
  }

  startupStateListener(event, state, progress) {
    this.setState({
      state,
      progress,
    });
  }

  render() {
    return (
      <Container className="Splash-Container">
        <Row>
          <Col xs={12} className="splash-window">
            <img alt="Loading" src="../img/gifs/loading.gif" />
          </Col>
          <Col xs={12} className="splash-message">
            {this.getAppMessage()}
          </Col>
        </Row>
      </Container>
    );
  }
}

// export default App;
export default hot(module)(SplashWindow);
