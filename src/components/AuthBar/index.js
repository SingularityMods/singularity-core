import './AuthBar.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
const { ipcRenderer } = require('electron');

class AuthBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            profile: null
        }
        this.authEventListener = this.authEventListener.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('auth-event', this.authEventListener);

        let profile = ipcRenderer.sendSync('get-profile');
        this.setState({
            profile: profile
        })
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('auth-event', this.authEventListener);
    }


    authEventListener(event,type, success, message) {
        if (success) {
            let profile = ipcRenderer.sendSync('get-profile');
            this.setState({
                profile: profile
            })
        }
    }

    render() {
        return (
            <Row>
                <Col xs={12} className="AuthBar">
                    <div className="auth-user-icon" onClick={this.props.onOpenProfileMenu}>
                        {this.state.profile
                            ? <img key={Date.now()} id="authbar-user-avatar" src={this.state.profile.avatar} />
                            : <img key={Date.now()}  id="authbar-user-avatar" src='../img/icons/unauthenticated-avatar.jpg' />
                        }             
                    </div> 
                </Col>
            </Row>
        )
    }
}

AuthBar.propTypes = {
    onOpenProfileMenu: PropTypes.func
}

export default AuthBar;
