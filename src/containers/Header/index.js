import './Header.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
const { ipcRenderer } = require('electron');

import AuthBar from '../../components/AuthBar';
import AppMenu from '../AppMenu';


export default class Header extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            maximized: false,
            updateAvailable: false,
            darkMode: false
        }
        this.updatePendingListener = this.updatePendingListener.bind(this);
        this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
        this.handleClickUpdate = this.handleClickUpdate.bind(this);
        this.handleClick = this.handleClick.bind(this);

    }

    componentDidMount() {
        var maximized = ipcRenderer.sendSync('is-maximized-window');
        var updateAvailable = ipcRenderer.sendSync('is-app-update-available');
        ipcRenderer.on('update-pending', this.updatePendingListener);
        ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
        const appSettings = ipcRenderer.sendSync('get-app-settings');
        let darkMode = appSettings.darkMode;
        this.setState({
            maximized: maximized,
            updateAvailable: updateAvailable,
            darkMode: darkMode
        });
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('update-pending', this.updatePendingListener);
        ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
    }

    updatePendingListener(event) {
        this.setState({
            updateAvailable: true
        })
    } 

    darkModeToggleListener(event,darkMode) {
        this.setState({
            darkMode: darkMode
        })
    }

    handleClick() {
        this.props.onClick();
    }

    handleClickUpdate() {
        ipcRenderer.send('install-pending-update');
    }

    handleMinimize() {
        ipcRenderer.send('minimize-window');
    }

    handleMaximize() {
        ipcRenderer.send('maximize-window');
    }

    handleMaxUnMax() {
        var maximized = ipcRenderer.sendSync('max-un-max-window');
        console.log(maximized);
        this.setState({
            maximized: maximized
        });
    }

    handleClose() {
        ipcRenderer.send('close-window');
    }

    render() {
        return (
            <div>
                {process.platform !== 'darwin'
                    ? <AppMenu />
                    : ''
                }
            <Row className="Header">
                <Col xs={6}>
                    <img key={this.state.darkMode} src={this.state.darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'} onClick={this.handleClick} className="app-icon" />
                    {this.state.updateAvailable
                        ? <div className="app-update-button" onClick={this.handleClickUpdate}>
                            <div className="app-update-button-header">
                                Update Available
                            </div>
                            <div className="app-update-button-message">
                                Click to restart and install
                            </div>
                            </div>
                        : ''
                    }
                </Col>
                <Col xs={6}>
                        <AuthBar onOpenAuth={this.props.onOpenAuth} onOpenProfileMenu={this.props.onOpenProfileMenu}/>
                </Col>
                </Row>
                </div>
        )
    }
}