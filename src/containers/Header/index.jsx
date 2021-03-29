import './Header.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import { ipcRenderer } from 'electron';
import AuthBar from '../../components/AuthBar';
import AppMenu from '../AppMenu';

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      darkMode: false,
    };
    this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
    const appSettings = ipcRenderer.sendSync('get-app-settings');
    const { darkMode } = appSettings;
    this.setState({
      darkMode,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
  }

  darkModeToggleListener(_event, darkMode) {
    this.setState({
      darkMode,
    });
  }

  render() {
    const { darkMode } = this.state;
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
                src={darkMode ? '../img/app_icon_v2_white.png' : '../img/app_icon_v2.png'}
                className="app-icon"
              />
            </div>
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
