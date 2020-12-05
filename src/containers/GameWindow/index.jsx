import './GameWindow.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

import InstallationFinder from '../../components/InstallationFinder';
import GameWindowMenu from '../../components/GameWindowMenu';
import InstalledAddonsWindow from '../../components/InstalledAddonsWindow';
import BrowseAddonsWindow from '../../components/BrowseAddonsWindow';
import AddonDetailsWindow from '../../components/AddonDetailsWindow';

const { ipcRenderer } = require('electron');

class GameWindow extends React.Component {
  constructor(props) {
    super(props);
    const { gameId } = this.props;
    this.state = {
      activeTab: 'installed',
      appUUID: '',
      bannerPath: '',
      gameId,
      installedVersions: [],
      selectedAddon: '',
      selectedGameVersion: '',
    };

    this.installationFinderListener = this.installationFinderListener.bind(this);
    this.toggleGameVersion = this.toggleGameVersion.bind(this);
    this.toggleActiveTab = this.toggleActiveTab.bind(this);
    this.selectAddon = this.selectAddon.bind(this);
    this.handleGoBack = this.handleGoBack.bind(this);
  }

  componentDidMount() {
    const { gameId } = this.state;
    ipcRenderer.on('installation-found', this.installationFinderListener);
    const gameData = ipcRenderer.sendSync('get-game-data', gameId);
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const defaultWowVersion = ipcRenderer.sendSync('get-default-wow-version');
    const appUUID = ipcRenderer.sendSync('get-app-uuid');
    const installedVersions = [];
    let selectedGameVersion = '';
    Object.entries(gameSettings).forEach(([gameVersion]) => {
      if (gameSettings[gameVersion].installed) {
        installedVersions.push({
          gameVersion,
          nickName: gameData.gameVersions[gameVersion].nickName,
          installPath: gameSettings[gameVersion].installPath,
        });
      }
    });
    if (installedVersions.length > 0) {
      if (installedVersions.find((elem) => elem.gameVersion === defaultWowVersion)) {
        selectedGameVersion = defaultWowVersion;
      } else {
        selectedGameVersion = installedVersions[0].gameVersion;
      }
    }
    this.setState({
      bannerPath: gameData.bannerPath,
      installedVersions,
      selectedGameVersion,
      appUUID,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('installation-found', this.installationFinderListener);
  }

  handleGoBack() {
    this.setState({
      selectedAddon: '',
    });
  }

  installationFinderListener() {
    const { gameId } = this.state;
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const gameData = ipcRenderer.sendSync('get-game-data', gameId);
    const installedVersions = [];
    let selectedGameVersion = '';
    gameSettings.forEach((gameVersion) => {
      if (gameSettings[gameVersion].installed) {
        installedVersions.push({
          gameVersion,
          nickName: gameData.gameVersions[gameVersion].nickName,
          installPath: gameSettings[gameVersion].installPath,
        });
      }
    });
    if (installedVersions.length > 0) {
      selectedGameVersion = installedVersions[0].gameVersion;
    }
    this.setState({
      installedVersions,
      selectedGameVersion,
    });
  }

  selectAddon(addonId) {
    this.setState({
      selectedAddon: addonId,
    });
  }

  toggleActiveTab(activeTab) {
    this.setState({
      selectedAddon: '',
      activeTab,
    });
  }

  toggleGameVersion(gameVersion) {
    if (gameVersion === 'find') {
      const { gameId } = this.state;
      ipcRenderer.send('manually-find-game', gameId);
    } else {
      this.setState({
        selectedAddon: '',
        selectedGameVersion: gameVersion,
      });
    }
  }

  render() {
    const {
      activeTab,
      appUUID,
      bannerPath,
      gameId,
      installedVersions,
      selectedAddon,
      selectedGameVersion,
    } = this.state;
    const {
      backupPending,
      darkMode,
      restorePending,
      latestCloudBackup,
      lastRestoreComplete,
      openBackupManagementDialog,
      openBackupRestore,
    } = this.props;
    return (
      <div className="GameWindow">
        <Row>
          <Col className="game-banner">
            <img className="game-banner-image" alt="Addon banner" src={bannerPath} />
          </Col>
        </Row>
        <Row>
          <Col className="game-window-content">
            {selectedGameVersion ? (
              <div>
                <GameWindowMenu
                  darkMode={darkMode}
                  gameId={gameId}
                  selectedGameVersion={selectedGameVersion}
                  activeTab={activeTab}
                  installedVersions={installedVersions}
                  toggleActiveTab={this.toggleActiveTab}
                  toggleGameVersion={this.toggleGameVersion}
                />
                {selectedAddon ? (
                  <AddonDetailsWindow
                    darkMode={darkMode}
                    addonId={selectedAddon}
                    gameId={gameId}
                    gameVersion={selectedGameVersion}
                    handleGoBack={this.handleGoBack}
                  />
                ) : (
                  <div>
                    {activeTab === 'installed' ? (
                      <InstalledAddonsWindow
                        appUUID={appUUID}
                        darkMode={darkMode}
                        gameId={gameId}
                        gameVersion={selectedGameVersion}
                        backupPending={backupPending}
                        restorePending={restorePending}
                        openBackupManagementDialog={openBackupManagementDialog}
                        openBackupRestore={openBackupRestore}
                        latestCloudBackup={latestCloudBackup}
                        lastRestoreComplete={lastRestoreComplete}
                        toggleActiveTab={this.toggleActiveTab}
                        onSelectAddon={this.selectAddon}
                      />
                    ) : (
                      <BrowseAddonsWindow
                        darkMode={darkMode}
                        gameId={gameId}
                        gameVersion={selectedGameVersion}
                        onSelectAddon={this.selectAddon}
                      />
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div>

                <InstallationFinder
                  darkMode={darkMode}
                  gameId={gameId}
                  callback={this.installationFinderListener}
                />
              </div>
            )}
          </Col>
        </Row>
      </div>
    );
  }
}

GameWindow.propTypes = {
  backupPending: PropTypes.bool.isRequired,
  darkMode: PropTypes.bool.isRequired,
  gameId: PropTypes.number.isRequired,
  latestCloudBackup: PropTypes.instanceOf(Date).isRequired,
  lastRestoreComplete: PropTypes.instanceOf(Date).isRequired,
  openBackupManagementDialog: PropTypes.func.isRequired,
  openBackupRestore: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
};

export default GameWindow;
