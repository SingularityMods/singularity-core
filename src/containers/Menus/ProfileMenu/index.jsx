import './ProfileMenu.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

const { ipcRenderer } = require('electron');

class ProfileMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      profile: null,
    };
    this.wrapperRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleClickLogout = this.handleClickLogout.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    const profile = ipcRenderer.sendSync('get-profile');
    this.setState({
      profile,
    });
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside(event) {
    const { handleClose } = this.props;
    if (this.wrapperRef && !this.wrapperRef.current.contains(event.target) && event.target.id !== 'authbar-user-avatar') {
      handleClose();
    }
  }

  handleClickLogout(event) {
    const { handleClose } = this.props;
    event.preventDefault();
    ipcRenderer.send('logout-auth');
    handleClose();
  }

  render() {
    const { profile } = this.state;
    const { onOpenAuth, onOpenSettings } = this.props;
    function handleClose() {
      ipcRenderer.send('close-window');
    }
    return (
      <Container className={process.platform === 'win32' ? 'ProfileMenu windows' : 'ProfileMenu'} ref={this.wrapperRef}>
        {profile
          ? (
            <Row className="profile-menu-header">
              <Col xs={12} className="profile-menu-account">
                <img className="profile-menu-header-img" alt="Profile avatar" src={profile.avatar} />
                <h2 className="profile-menu-header-user">{profile.username}</h2>
              </Col>
            </Row>
          )
          : ''}
        <Row className="profile-menu-item">
          <Col xs={12} id="profile-menu-github" className="profile-menu-github">
          <a target="_blank"  rel="noreferrer" href="https://discord.gg/hqJX3jZkJS">
            <div><i className="fab fa-discord profile-menu-item-icon" /></div>
            <div className="profile-menu-item-lable">Discord Server</div>
            <div><i className="fas fa-external-link-alt profile-menu-item-icon external-icon" /></div>
          </a>
          </Col>
        </Row>
        <Row className="profile-menu-item">
          <Col xs={12} id="profile-menu-patreon" className="profile-menu-patreon">
            <a target="_blank"  rel="noreferrer" href="https://patreon.com/xorro">
              <div><i className="fab fa-patreon profile-menu-item-icon" /></div>
              <div className="profile-menu-item-lable">Support Us</div>
              <div><i className="fas fa-external-link-alt profile-menu-item-icon external-icon" /></div>
            </a> 
          </Col>
        </Row>
        <Row className="profile-menu-item">
          <Col xs={12} id="profile-menu-settings" className="profile-menu-settings" onClick={onOpenSettings}>
            <div><i className="fas fa-cog profile-menu-item-icon" /></div>
            <div className="profile-menu-item-lable">Settings</div>
          </Col>
        </Row>
        {profile
          ? (
            <Row className="profile-menu-item">
              <Col xs={12} id="profile-menu-logout" className="profile-menu-auth logout" onClick={this.handleClickLogout}>
                <div><i className="fas fa-sign-in-alt profile-menu-item-icon" /></div>
                <div className="profile-menu-item-lable">Logout</div>
              </Col>
            </Row>
          )
          : ''}
        {profile
          ? ''
          : (
            <Row className="profile-menu-item">
              <Col xs={12} id="profile-menu-login" className="profile-menu-auth login" onClick={() => onOpenAuth('login')}>
                <div><i className="fas fa-sign-in-alt profile-menu-item-icon" /></div>
                <div className="profile-menu-item-lable">Login</div>
              </Col>
            </Row>
          )}
        {profile
          ? ''
          : (
            <Row className="profile-menu-item">
              <Col xs={12} id="profile-menu-signup" className="profile-menu-auth signup" onClick={() => onOpenAuth('signup')}>
                <div><i className="fas fa-user profile-menu-item-icon" /></div>
                <div className="profile-menu-item-lable">Sign Up</div>
              </Col>
            </Row>
          )}
        <Row className="profile-menu-item">
          <Col xs={12} id="profile-menu-exit" className="profile-menu-exit" onClick={handleClose}>
            <div><i className="fas fa-times profile-menu-item-icon" /></div>
            <div className="profile-menu-item-lable">Exit</div>
          </Col>
        </Row>
      </Container>
    );
  }
}

ProfileMenu.propTypes = {
  handleClose: PropTypes.func.isRequired,
  onOpenAuth: PropTypes.func.isRequired,
  onOpenSettings: PropTypes.func.isRequired,
};

export default ProfileMenu;
