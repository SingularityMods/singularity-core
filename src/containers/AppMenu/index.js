import './AppMenu.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
const { ipcRenderer } = require('electron');

class AppMenu extends React.Component {
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

    darkModeToggleListener(event, darkMode) {
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
            <Row className="AppMenu">
                <Col xs={12} className="header-menu-col">
                    <div className="frame-menu pull-right">
                        <button className="menubar-btn" id="minimize-btn" onClick={this.handleMinimize}><i className="fas fa-window-minimize menu-icon"></i></button>
                        <button key={this.state.maximized} className="menubar-btn" id="max-unmax-btn" onClick={this.handleMaxUnMax}><i className={this.state.maximized ? "far fa-clone menu-icon" : "far fa-square menu-icon"}></i></button>

                        <button className="menubar-btn" id="close-btn" onClick={this.handleClose}><i className="fas fa-times menu-icon"></i></button>
                    </div>
                </Col>
            </Row>
        )
    }
}

AppMenu.propTypes = {
    onClick: PropTypes.func
}

export default AppMenu;