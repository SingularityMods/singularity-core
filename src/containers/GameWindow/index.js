import './GameWindow.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
const { ipcRenderer } = require('electron');

import InstallationFinder from '../../components/InstallationFinder';
import GameWindowMenu from '../../components/GameWindowMenu';
import InstalledAddonsWindow from '../../components/InstalledAddonsWindow';
import BrowseAddonsWindow from '../../components/BrowseAddonsWindow';
import AddonDetailsWindow from '../../components/AddonDetailsWindow';

class GameWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gameId: this.props.gameId,
            gameName: '',
            bannerPath: '',
            gameData: {},
            gameSettings: {},
            installedVersions: [],
            selectedGameVersion: '',
            selectedAddon: '',
            activeTab: 'installed',
            errorMessage: '',
            appUUID: ''
        }

        this.installationFinderListener = this.installationFinderListener.bind(this);
        this.toggleGameVersion = this.toggleGameVersion.bind(this);
        this.toggleActiveTab = this.toggleActiveTab.bind(this);
        this.selectAddon = this.selectAddon.bind(this);
        this.handleGoBack = this.handleGoBack.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('installation-found', this.installationFinderListener);
        const gameData = ipcRenderer.sendSync('get-game-data', this.state.gameId);
        const gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        const defaultWowVersion = ipcRenderer.sendSync('get-default-wow-version');
        const appUUID = ipcRenderer.sendSync('get-app-uuid');
        let installedVersions = [];
        let selectedGameVersion = '';
        for (var gameVersion in gameSettings) {
            if (gameSettings[gameVersion].installed) {
                installedVersions.push({ 'gameVersion': gameVersion, 'nickName': gameData.gameVersions[gameVersion].nickName, 'installPath': gameSettings[gameVersion].installPath })
            }
        }
        if (installedVersions.length > 0) {
            if (installedVersions.find(elem => {
                return elem.gameVersion === defaultWowVersion
            })) {
                selectedGameVersion = defaultWowVersion
            } else {
                selectedGameVersion = installedVersions[0].gameVersion;
            }
        }
        this.setState({
            gameName: gameData.name,
            bannerPath: gameData.bannerPath,
            installedVersions: installedVersions,
            selectedGameVersion: selectedGameVersion,
            gameData: gameData,
            gameSettings: gameSettings,
            appUUID: appUUID
        });
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('installation-found', this.installationFinderListener);
    }

    installationFinderListener() {
        var gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        var gameData = ipcRenderer.sendSync('get-game-data', this.state.gameId);
        let installedVersions = [];
        let selectedGameVersion = '';
        for (var gameVersion in gameSettings) {
            if (gameSettings[gameVersion].installed) {
                installedVersions.push({ 'gameVersion': gameVersion,'nickName':gameData.gameVersions[gameVersion].nickName, 'installPath': gameSettings[gameVersion].installPath })
            }
        }
        if (installedVersions.length > 0) {
            selectedGameVersion = installedVersions[0].gameVersion;
        }
        this.setState({
            installedVersions: installedVersions,
            selectedGameVersion: selectedGameVersion
        });
    }

    toggleActiveTab(activeTab) {
        this.setState({
            selectedAddon: '',
            activeTab: activeTab
        })
    }

    toggleGameVersion(gameVersion) {
        if (gameVersion == 'find') {
            ipcRenderer.send('manually-find-game', this.state.gameId);
        } else {
            this.setState({
                selectedAddon: '',
                selectedGameVersion: gameVersion
            })
        }
    }

    selectAddon(addonId) {
        this.setState({
            selectedAddon: addonId
        });
    }

    handleGoBack() {
        this.setState({
            selectedAddon: ''
        })
    }

    render() {
        return (
            <div className="GameWindow">
                <Row>
                    <Col className="game-banner">
                        <img className="game-banner-image" src={this.state.bannerPath} />
                    </Col>
                </Row>
                <Row>
                    <Col className="game-window-content">
                        {this.state.selectedGameVersion ? (
                            <div>
                                <GameWindowMenu
                                    gameId={this.state.gameId}
                                    selectedGameVersion={this.state.selectedGameVersion}
                                    activeTab={this.state.activeTab}
                                    installedVersions={this.state.installedVersions}
                                    toggleActiveTab={this.toggleActiveTab}
                                    toggleGameVersion={this.toggleGameVersion} />
                                {this.state.selectedAddon ? (
                                    <AddonDetailsWindow
                                        addonId={this.state.selectedAddon}
                                        gameId={this.state.gameId}
                                        gameVersion={this.state.selectedGameVersion}
                                        handleGoBack={this.handleGoBack} />
                                ) : (
                                    <div>
                                    {this.state.activeTab == 'installed' ? (
                                        <InstalledAddonsWindow
                                            appUUID={this.state.appUUID}
                                            gameId={this.state.gameId}
                                            gameVersion={this.state.selectedGameVersion}
                                            backupPending={this.props.backupPending}
                                            restorePending={this.props.restorePending}
                                            openBackupManagementDialog={this.props.openBackupManagementDialog}
                                            openBackupRestore={this.props.openBackupRestore}
                                            latestCloudBackup={this.props.latestCloudBackup}
                                            lastRestoreComplete={this.props.lastRestoreComplete}
                                            toggleActiveTab={this.toggleActiveTab}
                                            onSelectAddon={this.selectAddon}/>
                                        ) : (
                                        <BrowseAddonsWindow
                                            gameId={this.state.gameId}
                                            gameVersion={this.state.selectedGameVersion}
                                            onSelectAddon={this.selectAddon} />
                                                )}
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div>

                                <InstallationFinder
                                    gameId={this.state.gameId}
                                    callback={this.installationFinderListener}/>
                            </div>
                        )}
                    </Col>
                </Row>
            </div>
        )
    }
}

GameWindow.propTypes = {
    backupPending: PropTypes.bool,
    gameId: PropTypes.number,
    latestCloudBackup: PropTypes.object,
    lastRestoreComplete: PropTypes.object,
    openBackupManagementDialog: PropTypes.func,
    openBackupRestore: PropTypes.func,
    restorePending: PropTypes.bool
}

export default GameWindow;
