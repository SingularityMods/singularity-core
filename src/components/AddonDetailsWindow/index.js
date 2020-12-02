import './AddonDetailsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';
import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Button } from 'react-bootstrap';
const { ipcRenderer } = require('electron');

import AddonScreenshotsTab from '../AddonScreenshotsTab'
import AddonVersionTable from '../AddonVersionTable';
import GameMenuButton from '../Buttons/GameMenuButton';
import UpdateAddonButton from '../Buttons/UpdateAddonButton';

import ConfirmationDialog from '../Dialogs/ConfirmationDialog';

import LoadingSpinner from '../LoadingSpinner';


class AddonDetailsWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gameId: this.props.gameId,
            gameVersion: this.props.gameVersion,
            addonId: this.props.addonId,
            addonVersion: '',
            errorMessage: '',
            installed: false,
            updateAvailable: false,
            installedFile: '',
            installedAddon: {},
            addon: {},
            activeTab: 1,
            currentlyUpdating: false,
            updateError: false,
            currentlyInstallingFile: '',
            isLoading: false,
            confirmDelete: false
        }
        this.addonInfoListener = this.addonInfoListener.bind(this);
        this.addonInstalledListener = this.addonInstalledListener.bind(this);
        this.addonUninstalledListener = this.addonUninstalledListener.bind(this);
        this.installAddon = this.installAddon.bind(this);
        this.reinstallAddon = this.reinstallAddon.bind(this);
        this.updateAddon = this.updateAddon.bind(this);
        this.uninstallAddon = this.uninstallAddon.bind(this);
        this.confirmUninstall = this.confirmUninstall.bind(this);
        this.rejectUninstall = this.rejectUninstall.bind(this);
        this.installAddonFile = this.installAddonFile.bind(this);
        this.toggleDetailSection = this.toggleDetailSection.bind(this);

    }

    componentDidUpdate(prevProps) {

        if (this.props.addonId !== prevProps.addonId) {
            ipcRenderer.send('get-addon-info', this.props.addonId);
            this.setState({
                addon: {},
                installedAddon: {},
                installedFile: {},
                installed: false
            });
        }
    }

    componentDidMount() {
        ipcRenderer.send('get-addon-info', this.props.addonId);
        ipcRenderer.on('addon-info-result', this.addonInfoListener);
        ipcRenderer.on('addon-installed', this.addonInstalledListener);
        ipcRenderer.on('addon-uninstalled', this.addonUninstalledListener);
        const gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        const addonVersion = ipcRenderer.sendSync('get-game-addon-version', this.props.gameId, this.props.gameVersion);
        let installedAddons = gameSettings[this.state.gameVersion].installedAddons;
        var installed = false;
        var updateAvailable = false;
        var installedFile = '';
        var installedAddon = {};

        installedAddons.forEach((addon) => {
            if (addon.addonId == this.props.addonId) {
                console.log(addon);
                installedAddon = addon;
                installed = true;
                if (addon.updateAvailable) {
                    updateAvailable = true;
                }
                installedFile = addon.fileName;
            }
        })
        this.setState({
            installed: installed,
            updateAvailable: updateAvailable,
            installedFile, installedFile,
            installedAddon: installedAddon,
            addonVersion: addonVersion,
            isLoading: true
        });
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('addon-info-result', this.addonInfoListener);
        ipcRenderer.removeListener('addon-installed', this.addonInstalledListener)
        ipcRenderer.removeListener('addon-uninstalled', this.addonUninstalledListener);
    }

    addonInfoListener(event, addon) {
        let desc = addon.description;
        addon.description = desc.replace(/<a href/g, "<a target='_blank' href")
        this.setState({
            addon: addon,
            isLoading: false
        })
    } 

    addonInstalledListener(event, installedAddon) {


        var updateAvailable = installedAddon.updateAvailable;
        this.setState({
            installed: true,
            installFile: installedAddon.fileName,
            installedAddon: installedAddon,
            currentlyUpdating: false,
            currentlyInstallingFile: '',
            updateAvailable: updateAvailable,
            updateError: false
        })
    }

    addonUninstalledListener(event, addonId) {
        if (addonId == this.props.addonId) {
            this.setState({
                installed: false,
                installFile: '',
                installedAddon: {},
                currentlyUpdating: false,
                currentlyInstallingFile: '',
                updateAvailable: false,
                updateError: false
            })
        }
    }


    toggleDetailSection(selectedNum) {
        this.setState({
            activeTab: selectedNum
        });

    }

    installAddonFile(addon, addonFileId) {
        if (this.state.installedAddon.addonId == addon.addonId) {
            ipcRenderer.send('install-addon-file', this.state.gameId, this.state.gameVersion, this.state.installedAddon, addonFileId);
        } else {
            ipcRenderer.send('install-addon-file', this.state.gameId, this.state.gameVersion, addon, addonFileId);
        }
        this.setState({
            currentlyUpdating: true,
            currentlyInstallingFile: addonFileId
        });

        setTimeout(() => {
            if (this.state.currentlyUpdating) {
                this.setState({
                    updateError: true,
                    currentlyUpdating: false,
                    currentlyInstallingFile: ''
                });
            }
        }, 30000);
    }

    reinstallAddon() {
        let addon = this.state.installedAddon
        let installedFile = addon.installedFile._id || addon.installedFile.fileId;
        ipcRenderer.send('install-addon-file', this.state.gameId, this.state.gameVersion, addon, installedFile);
        this.setState({
            currentlyUpdating: true
        });
        setTimeout(() => {
            if (this.state.currentlyUpdating) {
                this.setState({
                    updateError: true,
                    currentlyUpdating: false
                });
            }
        }, 30000);
    }
    

    uninstallAddon() {
        this.setState({ confirmDelete: true });
    }

    confirmUninstall() {
        this.setState({ confirmDelete: false });
        ipcRenderer.send('uninstall-addon', this.state.gameId, this.state.gameVersion, this.props.addonId);
    }

    rejectUninstall() {
        this.setState({ confirmDelete: false });
    }

    updateAddon(addon) {
        ipcRenderer.send('update-addon', this.state.gameId, this.state.gameVersion, this.state.installedAddon);
        this.setState({
            currentlyUpdating: true
        });
        setTimeout(() => {
            if (this.state.currentlyUpdating) {
                this.setState({
                    updateError: true,
                    currentlyUpdating: false
                });
            }
        }, 30000);
    }

    installAddon(addon) {
        let branch = 1;
        if (this.state.installedAddon.addonId == addon.addonId) {
            ipcRenderer.send('install-addon', this.state.gameId, this.state.gameVersion, this.state.installedAddon, branch);

        } else {
            ipcRenderer.send('install-addon', this.state.gameId, this.state.gameVersion, addon, branch);
        }
        this.setState({
            currentlyUpdating: true
        });
        
        setTimeout(() => {
            if (this.state.currentlyUpdating) {
                this.setState({
                    updateError: true,
                    currentlyUpdating: false
                });
            }
        }, 30000);
    }



    render() {
        if (this.state.addon) {
            if (this.state.addon.categories) {
                var categoryNames = Array.prototype.map.call(this.state.addon.categories, c => c.name).toString();
            }

            if (this.state.addon.authors) {
                var authors = this.state.addon.authors;
            } else if (this.state.addon.curseAuthors) {
                var authors = "Curse: " + Array.prototype.map.call(this.state.addon.curseAuthors, a => a.name).toString();
            } else if (this.state.addon.tukuiAuthor) {
                var authors = "Tukui: " + this.state.addon.tukuiAuthor;
            }
            if (this.state.addon.totalDownloadCount) {
                if (this.state.addon.totalDownloadCount > 1000000) {
                    var downloadCount = this.state.addon.totalDownloadCount.toString().slice(0, -5);
                    let lastNum = downloadCount.charAt(downloadCount.length - 1);
                    downloadCount = downloadCount.slice(0, -1) + '.' + lastNum + "M"
                } else if (this.state.addon.totalDownloadCount > 1000) {
                    var downloadCount = this.state.addon.totalDownloadCount.toString().slice(0, -2);
                    let lastNum = downloadCount.charAt(downloadCount.length - 1);
                    downloadCount = downloadCount.slice(0, -1) + '.' + lastNum + "K"
                } else {
                    var downloadCount = this.state.addon.totalDownloadCount.toString()
                }
            } else {
                var downloadCount = "";
            }
            
        }
        return (
            <div className="GameDetailsWindow">
                {!this.state.isLoading
                    ? this.state.confirmDelete
                        ? <ConfirmationDialog
                            message={`Are you sure you want to uninstall ${this.state.addon.addonName}?`}
                            accept={this.confirmUninstall}
                            reject={this.rejectUninstall} />
                        : (
                    <div>
                        <SimpleBar scrollbarMaxSize={50} className="addon-details-window" >
                            <Row className="addon-details-top-menu">
                            <Col xs="3"><GameMenuButton handleClick={this.props.handleGoBack} type='Back' /></Col>
                            </Row>
                            <Row className="addon-info-row">
                            <Col xs="2" className="addon-icon">
                                {this.state.addon && this.state.addon.primaryCategory ? (
                                    <img src={this.state.addon.primaryCategory.iconUrl} className="addon-details-icon" />
                                ) : (
                                        ''
                                    )}
                                </Col>
                                <Col xs="10" lg="8" className="addon-info">
                                    <Row>
                                        <Col xs="10" >
                                        <span className="addon-info-bold">{this.state.addon.addonName}</span>
                                        {this.state.addon.addonName ? (
                                            <span className="addon-info-small addon-info-pad-left">{this.state.installedFile}</span>
                                        ) : (
                                                <span className="addon-info-small addon-info-pad-left"></span>

                                        )}
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col xs="12" className="addon-info-small">{categoryNames}</Col>
                                    </Row>
                                    <Row>
                                        <Col xs="12" className="addon-additional-info">
                                            <span className="addon-info-small">{downloadCount}</span><span className="addon-info-small addon-info-pad-left">{authors}</span>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col xs="12" className="addon-info-install-btn">
                                        {this.state.addon && this.state.addon.addonName
                                            ? this.state.currentlyUpdating
                                                ? <UpdateAddonButton handleClick={()=>{}} clickData={this.state.addon} disabled={true} type='Updating...' />
                                                : this.state.updateError
                                                    ? <UpdateAddonButton handleClick={()=>{}} clickData={this.state.addon} disabled={true} type='ERROR...' />
                                                    : this.state.installed
                                                        ? this.state.installedAddon.unknownUpdate
                                                            ? <UpdateAddonButton handleClick={this.reinstallAddon} type='Reinstall' />
                                                            : this.state.updateAvailable
                                                                ? <UpdateAddonButton handleClick={this.updateAddon} clickData={this.state.addon} type='Update' />
                                                                : <UpdateAddonButton handleClick={()=>{}} clickData={this.state.addon} disabled={true} type='Installed' />
                                                        : <UpdateAddonButton handleClick={this.installAddon} clickData={this.state.addon} type='Install' />
                                                : ''}
                                            {this.state.installed
                                                ? <UpdateAddonButton className="uninstall-button" handleClick={this.uninstallAddon} clickData={this.props.addonId} type='Uninstall' />
                                                : ''
                                            }
                                            
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                        <Row className="addon-details-menu">
                            <Col xs={12}>
                                <GameMenuButton className={this.state.activeTab == 1 ? 'active-tab' : '' } handleClick={this.toggleDetailSection} clickData={1} type='Overview' />
                                <GameMenuButton className={this.state.activeTab == 2 ? 'active-tab' : 'hidden'} handleClick={this.toggleDetailSection} clickData={2} type='Changelog' />
                                <GameMenuButton className={this.state.activeTab == 3 ? 'active-tab' : ''} handleClick={this.toggleDetailSection} clickData={3} type='Screenshot' />
                                <GameMenuButton className={this.state.activeTab == 4 ? 'active-tab' : ''} handleClick={this.toggleDetailSection} clickData={4} type='Versions' />
                                {
                                    this.state.addon && this.state.addon.addonUrl
                                    ?<Button className="addon-page-link"><a target="_blank" rel="noreferrer" href={this.state.addon.addonUrl}>Homepage<i className="addon-page-link-icon fas fa-external-link-alt"></i></a></Button>
                                    : ''
                                }

                            </Col>
                        </Row>
                        <Row className="addon-details-section">
                            {this.state.addon && this.state.addon.addonName
                            ?
                                {
                                    1: <div dangerouslySetInnerHTML={{ __html: this.state.addon.description }}></div>,
                                    2: 'test 2',
                                        3: <AddonScreenshotsTab screenshots={this.state.addon.screenshots} />,
                                        4: <AddonVersionTable gameVersion={this.state.gameVersion} addon={this.state.addon} installedAddon={this.state.installedAddon} currentlyInstallingFile={this.state.currentlyInstallingFile} handleInstall={this.installAddonFile} />,
                                }[this.state.activeTab]
                                
                            : ''
                            }
                            </Row>
                            </SimpleBar>
                        </div>
                    ) : (
                            <LoadingSpinner />
                    )}
            </div>
        )
    }
}

AddonDetailsWindow.propTypes = {
    addonId: PropTypes.string,
    gameId: PropTypes.number,
    gameVersion: PropTypes.string,
    handleGoBack: PropTypes.func
};

export default AddonDetailsWindow;
