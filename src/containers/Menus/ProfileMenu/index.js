import './ProfileMenu.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
const { ipcRenderer } = require('electron');



export default class Header extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            profile: null
        }
        this.wrapperRef = React.createRef();
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleClickLogout = this.handleClickLogout.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    

    componentDidMount() {
        document.addEventListener('mousedown', this.handleClickOutside);
        let profile = ipcRenderer.sendSync('get-profile');
            this.setState({
                profile: profile
            })
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    handleClickOutside(event) {
        if (this.wrapperRef && !this.wrapperRef.current.contains(event.target) && event.target.id != 'authbar-user-avatar') {
            this.props.handleClose();
        }
    }

    handleClickLogout = (event) => {
        event.preventDefault();
        ipcRenderer.send('logout-auth');
        this.props.handleClose();
    }

    handleClose = () => {
        ipcRenderer.send('close-window');
    }

    render() {
        return (
            <Container className={process.platform == 'win32' ? "ProfileMenu windows" : "ProfileMenu"} ref={this.wrapperRef}>
                {this.state.profile
                ? <Row className="profile-menu-header">
                    <Col xs={12} className="profile-menu-account">
                        <img className="profile-menu-header-img" src={this.state.profile.avatar} />
                        <h2 className="profile-menu-header-user">{this.state.profile.username}</h2>   
                    </Col>
                </Row>
                : ''}
                {this.state.profile
                    ?<Row className="profile-menu-item">
                        <Col xs={12} id="profile-menu-logout" className="profile-menu-auth logout" onClick={this.handleClickLogout}>
                            <div><i className="fas fa-sign-in-alt profile-menu-item-icon" /></div><div className="profile-menu-item-lable">Logout</div>
                        </Col>
                    </Row>
                    : ''
                }
                {this.state.profile
                    ? ''
                    : <Row className="profile-menu-item">
                        <Col xs={12} id="profile-menu-login" className="profile-menu-auth login" onClick={() => this.props.onOpenAuth('login')}>
                            <div><i className="fas fa-sign-in-alt profile-menu-item-icon" /></div><div className="profile-menu-item-lable">Login</div>
                        </Col>
                    </Row>
                }
                {this.state.profile
                    ? ''
                    : <Row className="profile-menu-item">
                        <Col xs={12} id="profile-menu-signup" className="profile-menu-auth signup" onClick={() => this.props.onOpenAuth('signup')}> 
                            <div><i className="fas fa-user profile-menu-item-icon" /></div><div className="profile-menu-item-lable">Sign Up</div>
                        </Col>
                    </Row>
                }
                <Row className="profile-menu-item">
                    <Col xs={12} id="profile-menu-settings" className="profile-menu-settings" onClick={this.props.onOpenSettings}>
                        <div><i className="fas fa-cog profile-menu-item-icon" /></div><div className="profile-menu-item-lable">Settings</div>
                    </Col>
                </Row>
                <Row className="profile-menu-item">
                    <Col xs={12} id="profile-menu-exit" className="profile-menu-exit" onClick={this.handleClose}>
                        <div><i className="fas fa-times profile-menu-item-icon" /></div><div className="profile-menu-item-lable">Exit</div>
                    </Col>
                </Row>
            </Container>
        )
    }
}