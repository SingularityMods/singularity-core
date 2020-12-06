import './AuthBar.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

const { ipcRenderer } = require('electron');

class AuthBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      profile: null,
    };
    this.authEventListener = this.authEventListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('auth-event', this.authEventListener);

    const profile = ipcRenderer.sendSync('get-profile');
    this.setState({
      profile,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('auth-event', this.authEventListener);
  }

  authEventListener(_event, _type, success) {
    if (success) {
      const profile = ipcRenderer.sendSync('get-profile');
      this.setState({
        profile,
      });
    }
  }

  render() {
    const {
      profile,
    } = this.state;
    const {
      onOpenProfileMenu,
    } = this.props;
    return (
      <Row>
        <Col xs={12} className="AuthBar">
          <div className="auth-user-icon" tabIndex="0" role="button" onClick={onOpenProfileMenu} onKeyPress={onOpenProfileMenu}>
            {profile
              ? <img key={Date.now()} id="authbar-user-avatar" alt="User avatar" src={profile.avatar} />
              : <img key={Date.now()} id="authbar-user-avatar" alt="User avatar" src="../img/icons/unauthenticated-avatar.jpg" />}
          </div>
        </Col>
      </Row>
    );
  }
}

AuthBar.propTypes = {
  onOpenProfileMenu: PropTypes.func.isRequired,
};

export default AuthBar;
