import './SettingsWindow.css';

import * as React from 'react';
import { Row, Col, Button, DropdownButton, Dropdown } from 'react-bootstrap';
import Switch from "react-switch";
const { ipcRenderer } = require('electron');
import SimpleBar from 'simplebar-react'
import ReactTooltip from 'react-tooltip';


export default class SettingsWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            appSettings: null,
            backupDirMsg: "",
            movingBackupDir: false,
            wowInstalls: null,
            wowInstallsErr: {}
        }
        this.toggleDarkMode = this.toggleDarkMode.bind(this);
        this.toggleUpdateInterval = this.toggleUpdateInterval.bind(this);
        this.toggleDefaultWow = this.toggleDefaultWow.bind(this);
        this.selectBackupDir = this.selectBackupDir.bind(this);
        this.movingBackupDirListener = this.movingBackupDirListener.bind(this);
        this.backupDirAcceptedListener = this.backupDirAcceptedListener.bind(this);
        this.backupDirRejectedListener = this.backupDirRejectedListener.bind(this);
        this.installDirChangeAcceptedListener = this.installDirChangeAcceptedListener.bind(this);
        this.installDirChangeRejectedListener = this.installDirChangeRejectedListener.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('moving-backup-dir', this.movingBackupDirListener);
        ipcRenderer.on('backup-dir-accepted', this.backupDirAcceptedListener);
        ipcRenderer.on('backup-dir-rejected', this.backupDirRejectedListener);
        ipcRenderer.on('installation-path-updated', this.installDirChangeAcceptedListener);
        ipcRenderer.on('installation-not-found', this.installDirChangeRejectedListener);
        const appSettings = ipcRenderer.sendSync('get-app-settings');
        const gameSettings = ipcRenderer.sendSync('get-game-settings',1);
        const wowInstalls = {
            'wow_retail': gameSettings['wow_retail'].installPath,
            'wow_classic': gameSettings['wow_classic'].installPath,
            'wow_retail_ptr': gameSettings['wow_retail_ptr'].installPath,
            'wow_classic_ptr': gameSettings['wow_classic_ptr'].installPath,
            'wow_retail_beta': gameSettings['wow_retail_beta'].installPath

        };
        this.setState({
            appSettings: appSettings,
            wowInstalls: wowInstalls
        });
        
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('moving-backup-dir', this.movingBackupDirListener);
        ipcRenderer.removeListener('backup-dir-accepted', this.backupDirAcceptedListener);
        ipcRenderer.removeListener('backup-dir-rejected', this.backupDirRejectedListener);
        ipcRenderer.removeListener('installation-path-updated', this.installDirChangeAcceptedListener);
        ipcRenderer.removeListener('installation-not-found', this.installDirChangeRejectedListener);
    }

    toggleDarkMode(checked) {
        let appSettings = this.state.appSettings;
        appSettings.darkMode = checked;
        ipcRenderer.send('set-app-settings', appSettings);
        this.setState({
            appSettings: appSettings
        });
    }

    toggleUpdateInterval(i) {
        let appSettings = this.state.appSettings;
        appSettings.addonUpdateInterval = i;
        ipcRenderer.send('set-app-settings', appSettings);
        this.setState({
            appSettings: appSettings
        })
    }

    toggleDefaultWow(i) {
        let appSettings = this.state.appSettings;
        appSettings.defaultWowVersion = i;
        ipcRenderer.send('set-app-settings', appSettings);
        this.setState({
            appSettings: appSettings
        })
    }

    selectBackupDir() {
        ipcRenderer.send('select-backup-dir');
    }

    movingBackupDirListener() {
        this.setState({
            movingBackupDir: true
        });
    }

    backupDirAcceptedListener() {
        const appSettings = ipcRenderer.sendSync('get-app-settings');
        this.setState({
            appSettings: appSettings,
            movingBackupDir: false
        });
    }

    backupDirRejectedListener(evetn,msg) {
        this.setState({
            backupDirMsg: msg,
            movingBackupDir: false
        });

        setTimeout(() => {
            this.setState({
                backupDirMsg: ''
            });
        }, 5000);
    }

    changeWowInstallDir(gameVersion) {
        ipcRenderer.send('update-wow-path', gameVersion);
    }

    installDirChangeAcceptedListener(event,gameVersion,path) {
        var wowInstalls = this.state.wowInstalls;
        wowInstalls[gameVersion] = path;
        var wowInstallsErr = this.state.wowInstallsErr;
        wowInstallsErr[gameVersion] = false;
        this.setState({
            wowInstalls: wowInstalls,
            wowInstallsErr: wowInstallsErr
        });
    }

    installDirChangeRejectedListener(event,gameVersion) {
        var wowInstallsErr = this.state.wowInstallsErr;
        wowInstallsErr[gameVersion] = true;
        this.setState({
            wowInstallsErr: wowInstallsErr
        });
    }

    render() {
        var updateIntTitle = '1 hour';
        if (this.state.appSettings && this.state.appSettings.addonUpdateInterval) {
            switch (this.state.appSettings.addonUpdateInterval) {
                case '15m':
                    updateIntTitle = '15 Minutes';
                    break;
                case '30m':
                    updateIntTitle = '30 Minutes';
                    break;
                case '1h':
                    updateIntTitle = '1 Hour';
                    break;
                case '3h':
                    updateIntTitle = '3 Hours';
                    break;
                default:
                    updateIntTitle = '1 Hour';

            }
        }
        var defaultWowTitle = 'Retail';
        if (this.state.appSettings && this.state.appSettings.defaultWowVersion) {
            switch (this.state.appSettings.defaultWowVersion) {
                case 'wow_retail':
                    defaultWowTitle = 'Retail';
                    break;
                case 'wow_classic':
                    defaultWowTitle = 'Classic';
                    break;
                case 'wow_retail_ptr':
                    defaultWowTitle = 'Retail PTR';
                    break;
                case 'wow_classic_ptr':
                    defaultWowTitle = 'Classic PTR';
                    break;
                case 'wow_retail_beta':
                    defaultWowTitle = 'Retail Beta';
                default:
                    defaultWowTitle = 'Retail';

            }
        }
        return (
    
            <div className="SettingsWindow">
                {(this.state.appSettings && this.state.wowInstalls)
                ?<SimpleBar scrollbarMaxSize={50} className="settings-scrollbar">
                        <div>
                        <Row className="settings-exit">
                                <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                                    <Button className="settings-close-button" id="close-settings-btn" onClick={this.props.onClose}>Close</Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={{ span: 10, offset: 1 }} className="settings-window-header">
                                Settings
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12} className="settings-window-section-header">
                                User Preferences
                            </Col>
                        </Row>
                            <Row>
                                <Col xs={12} className="settings-section">
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Dark Mode</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            {this.state.appSettings
                                                ?   <Switch
                                                    onChange={this.toggleDarkMode}
                                                    checked={this.state.appSettings.darkMode}
                                                    className="settings-switch"
                                                    onColor="#ED8323"
                                                    height={20}
                                                    width={40}
                                                    activeBoxShadow="0 0 2px 3px #ED8323" />
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Addon Update Interval</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            <DropdownButton id="update-interval-dropdown"
                                                title={updateIntTitle}
                                                onSelect={this.toggleUpdateInterval}>
                                                    <Dropdown.Item
                                                        key='15m'
                                                        eventKey='15m'
                                                >15 Minutes</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='30m'
                                                    eventKey='30m'
                                                >30 Minutes</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='1h'
                                                    eventKey='1h'
                                                >1 Hour</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='3h'
                                                    eventKey='3h'
                                                >3 Hours</Dropdown.Item>
                                            </DropdownButton>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>

                        <Row>
                            <Col xs={12} className="settings-window-section-header">
                                World of Warcraft Settings
                            </Col>
                        </Row>
                            <Row>
                                <Col xs={12} className="settings-section">
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Default WoW Version</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            <DropdownButton id="default-wow-dropdown"
                                                title={defaultWowTitle}
                                                onSelect={this.toggleDefaultWow}>
                                                <Dropdown.Item
                                                    key='wow_retail'
                                                    eventKey='wow_retail'
                                                >Retail</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='wow_classic'
                                                    eventKey='wow_classic'
                                                >Classic</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='wow_retail_ptr'
                                                    eventKey='wow_retail_ptr'
                                                >PTR</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='wow_classic_ptr'
                                                    eventKey='wow_classic_ptr'
                                                >Classic PTR</Dropdown.Item>
                                                <Dropdown.Item
                                                    key='wow_retail_beta'
                                                    eventKey='wow_retail_beta'
                                                >Retail Beta</Dropdown.Item>
                                            </DropdownButton>
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Retail Install Path</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            <a data-tip data-for="retail-dir-location">
                                                <Button className="select-install-dir-button"
                                                    onClick={() => this.changeWowInstallDir('wow_retail')}>
                                                    {this.state.wowInstalls.wow_retail}
                                                </Button>
                                            </a>
                                            <ReactTooltip id="retail-dir-location">
                                                <span>{this.state.wowInstalls.wow_retail}</span>
                                            </ReactTooltip>
                                            {this.state.wowInstallsErr && this.state.wowInstallsErr.wow_retail
                                                ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Classic Install Path</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            <a data-tip data-for="classic-dir-location">
                                                <Button className="select-install-dir-button"
                                                    onClick={() => this.changeWowInstallDir('wow_classic')}>
                                                    {this.state.wowInstalls.wow_classic}
                                                </Button>
                                            </a>
                                            <ReactTooltip id="classic-dir-location">
                                                <span>{this.state.wowInstalls.wow_classic}</span>
                                            </ReactTooltip>
                                            {this.state.wowInstallsErr && this.state.wowInstallsErr.wow_classic
                                                ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>PTR Install Path</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                            <a data-tip data-for="ptr-dir-location">
                                                <Button className="select-install-dir-button"
                                                    onClick={() => this.changeWowInstallDir('wow_retail_ptr')}>
                                                    {this.state.wowInstalls.wow_retail_ptr}
                                                </Button>
                                            </a>
                                            <ReactTooltip id="ptr-dir-location">
                                                <span>{this.state.wowInstalls.wow_retail_ptr}</span>
                                            </ReactTooltip>
                                            {this.state.wowInstallsErr && this.state.wowInstallsErr.wow_retail_ptr
                                                ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Classic PTR Install Path</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                             <a data-tip data-for="classic-ptr-dir-location">
                                                <Button className="select-install-dir-button"
                                                    onClick={() => this.changeWowInstallDir('wow_classic_ptr')}>
                                                    {this.state.wowInstalls.wow_classic_ptr}
                                             </Button></a>

                                            <ReactTooltip id="classic-ptr-dir-location">
                                                <span>{this.state.wowInstalls.wow_classic_ptr}</span>
                                            </ReactTooltip>
                                            {this.state.wowInstallsErr && this.state.wowInstallsErr.wow_classic_ptr
                                                ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                    <Row className="settings-item">
                                        <Col xs={4} md={3} className="settings-item-name">
                                            <label>
                                                <span>Beta Install Path</span>
                                            </label>
                                        </Col>
                                        <Col xs={8} md={9} className="settings-item-config">
                                           <a data-tip data-for="beta-dir-location">
                                                <Button className="select-install-dir-button"
                                                    onClick={() => this.changeWowInstallDir('wow_reta_beta')}>
                                                    {this.state.wowInstalls.wow_retail_beta}
                                            </Button></a>
                                            <ReactTooltip id="beta-dir-location">
                                                <span>{this.state.wowInstalls.wow_retail_beta}</span>
                                            </ReactTooltip>
                                            {this.state.wowInstallsErr && this.state.wowInstallsErr.wow_retail_beta
                                                ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                                                : ''
                                            }
                                        </Col>
                                    </Row>
                                </Col>
                              </Row>
                    </div>
                </SimpleBar>    
                : ''
                }            
            </div>
        )
    }
}