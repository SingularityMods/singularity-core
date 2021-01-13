import './Header.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import AuthBar from '../../components/AuthBar';
import AppMenu from '../AppMenu';

const { ipcRenderer } = require('electron');

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      updateAvailable: false,
      darkMode: false,
    };
    this.updatePendingListener = this.updatePendingListener.bind(this);
    this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
  }

  componentDidMount() {
    const updateAvailable = ipcRenderer.sendSync('is-app-update-available');
    ipcRenderer.on('update-pending', this.updatePendingListener);
    ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
    const appSettings = ipcRenderer.sendSync('get-app-settings');
    const { darkMode } = appSettings;
    this.setState({
      updateAvailable,
      darkMode,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('update-pending', this.updatePendingListener);
    ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
  }

  darkModeToggleListener(_event, darkMode) {
    this.setState({
      darkMode,
    });
  }

  updatePendingListener() {
    this.setState({
      updateAvailable: true,
    });
  }

  render() {
    function handleClickUpdate() {
      ipcRenderer.send('install-pending-update');
    }
    const { darkMode, updateAvailable } = this.state;
    const { onClick, onOpenProfileMenu } = this.props;
    return (
      <div>
        {process.platform !== 'darwin'
          ? <AppMenu />
          : ''}
        <Row className="Header">
          <Col xs={6}>
            <div className="app-icon-button" role="button" tabIndex="0" onClick={onClick} onKeyPress={onClick}>
              <img
                alt="App logo"
                key={darkMode}
                src={darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'}
                className="app-icon"
              />
            </div>
            {updateAvailable
              ? (
                <div role="button" tabIndex="0" onClick={handleClickUpdate} onKeyPress={handleClickUpdate} className="app-update-button">
                  <div className="app-update-button-header">
                    Update Available
                  </div>
                  <div className="app-update-button-message">
                    Click to restart and install
                  </div>
                </div>
              )
              : ''}
          </Col>
          <Col xs={6}>
            <AuthBar
              onOpenProfileMenu={onOpenProfileMenu}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

Header.propTypes = {
  onClick: PropTypes.func.isRequired,
  onOpenProfileMenu: PropTypes.func.isRequired,
};

export default Header;
