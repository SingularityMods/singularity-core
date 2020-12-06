import './InstallationFinder.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import { ipcRenderer } from 'electron';

import LoadingSpinner from '../LoadingSpinner';

class InstallationFinder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      isSearching: false,
    };

    this.selectManualFind = this.selectManualFind.bind(this);
    this.selectAutoFind = this.selectAutoFind.bind(this);
    this.installationNotFoundListener = this.installationNotFoundListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('installation-not-found', this.installationNotFoundListener);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('installation-not-found', this.installationNotFoundListener);
    clearTimeout(this.timeout);
  }

  selectManualFind() {
    const {
      gameId,
    } = this.props;
    ipcRenderer.send('manually-find-game', gameId);
    this.setState({
      message: '',
    });
  }

  selectAutoFind() {
    const {
      gameId,
    } = this.props;
    ipcRenderer.send('auto-find-game', gameId);
    this.setState({
      isSearching: true,
      message: '',
    });

    this.timeout = setTimeout(() => {
      this.setState({
        message: "We couldn't locate the game, try finding the installation folder manually.",
        isSearching: false,
      });
    }, 10000);
  }

  installationNotFoundListener(event, msg) {
    this.setState({
      message: msg,
      isSearching: false,
    });
  }

  render() {
    const {
      isSearching,
      message,
    } = this.state;
    return (
      <div className="InstallationFinder">
        <Row>
          <Col xs={12} className="installation-finder-header">
            <h2>hmmmmm... We couldn&apos;t find this game</h2>
            <p className="installation-finder-error">{message}</p>
          </Col>
        </Row>
        <Row>
          <Col className="installation-finder-container">
            <button type="button" className="find-game-button" onClick={this.selectAutoFind}>Scan For Game</button>
            <button type="button" className="find-game-button" onClick={this.selectManualFind}>Find Game Manually</button>
          </Col>
        </Row>
        {isSearching
          ? <LoadingSpinner />
          : ''}
      </div>
    );
  }
}

InstallationFinder.propTypes = {
  gameId: PropTypes.number.isRequired,
};

export default InstallationFinder;
