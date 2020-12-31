import './AddonDetailsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';
import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Button } from 'react-bootstrap';

import AddonScreenshotsTab from '../AddonScreenshotsTab';
import AddonVersionTable from '../AddonVersionTable';
import GameMenuButton from '../Buttons/GameMenuButton';
import UpdateAddonButton from '../Buttons/UpdateAddonButton';

import ConfirmationDialog from '../Dialogs/ConfirmationDialog';

import LoadingSpinner from '../LoadingSpinner';

const { ipcRenderer } = require('electron');

function getLatestFile(addon, addonVersion) {
  let possibleFiles = addon.latestFiles.filter((file) => (
    file.gameVersionFlavor === addonVersion && file.releaseType <= addon.trackBranch
  ));
  if (!possibleFiles || possibleFiles.length === 0) {
    possibleFiles = addon.latestFiles.filter((file) => file.gameVersionFlavor === addonVersion);
    return possibleFiles.reduce((a, b) => ((a.releaseType < b.releaseType) ? a : b));
  }
  return possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
}

class AddonDetailsWindow extends React.Component {
  constructor(props) {
    super(props);
    const {
      gameId,
      gameVersion,
    } = this.props;
    this.state = {
      gameId,
      gameVersion,
      installed: false,
      updateAvailable: false,
      addonVersion: '',
      installedFile: '',
      installedAddon: {},
      addon: {},
      activeTab: 1,
      currentlyUpdating: false,
      updateError: false,
      currentlyInstallingFile: '',
      isLoading: false,
      confirmDelete: false,
    };
    this.addonInfoListener = this.addonInfoListener.bind(this);
    this.installAddon = this.installAddon.bind(this);
    this.reinstallAddon = this.reinstallAddon.bind(this);
    this.updateAddon = this.updateAddon.bind(this);
    this.uninstallAddon = this.uninstallAddon.bind(this);
    this.confirmUninstall = this.confirmUninstall.bind(this);
    this.rejectUninstall = this.rejectUninstall.bind(this);
    this.installAddonFile = this.installAddonFile.bind(this);
    this.toggleDetailSection = this.toggleDetailSection.bind(this);
    this.getAddonStatus = this.getAddonStatus.bind(this);
  }

  componentDidMount() {
    const {
      addonId,
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('get-addon-info', addonId);
    ipcRenderer.on('addon-info-result', this.addonInfoListener);
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
    const { installedAddons } = gameSettings[gameVersion];
    let installed = false;
    let updateAvailable = false;
    let installedFile = '';
    let installedAddon = {};

    installedAddons.forEach((addon) => {
      if (addon.addonId === addonId) {
        installedAddon = addon;
        installed = true;
        if (addon.updateAvailable) {
          updateAvailable = true;
        }
        installedFile = addon.fileName;
      }
    });
    this.setState({
      addonVersion,
      installed,
      updateAvailable,
      installedFile,
      installedAddon,
      isLoading: true,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('addon-info-result', this.addonInfoListener);
    if (this.installTimeout) {
      clearTimeout(this.installTimeout);
      this.installTimeout = 0;
    }
    if (this.installFileTimeout) {
      clearTimeout(this.installFileTimeout);
      this.installFileTimeout = 0;
    }
    if (this.updatetimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = 0;
    }
    if (this.reinstallTimeout) {
      clearTimeout(this.reinstallTimeout);
      this.reinstallTimeout = 0;
    }
  }

  getAddonStatus() {
    const {
      addon,
      currentlyUpdating,
      updateError,
      installed,
      installedAddon,
      updateAvailable,
    } = this.state;
    if (!addon || !addon.addonName) {
      return '';
    }
    if (currentlyUpdating) {
      return <UpdateAddonButton handleClick={() => {}} clickData={addon} disabled type="Updating..." />;
    }
    if (updateError) {
      return <UpdateAddonButton handleClick={() => {}} clickData={addon} disabled type="ERROR..." />;
    }
    if (installed) {
      if (installedAddon.unknownUpdate) {
        return <UpdateAddonButton handleClick={this.reinstallAddon} type="Reinstall" />;
      }
      if (updateAvailable) {
        return <UpdateAddonButton handleClick={this.updateAddon} clickData={addon} type="Update" />;
      }
      return <UpdateAddonButton handleClick={() => {}} clickData={addon} disabled type="Installed" />;
    }
    return <UpdateAddonButton handleClick={this.installAddon} clickData={addon} type="Install" />;
  }

  toggleDetailSection(selectedNum) {
    this.setState({
      activeTab: selectedNum,
    });
  }

  installAddonFile(addon, addonFileId) {
    const {
      gameId,
      gameVersion,
    } = this.state;
    this.setState({
      currentlyUpdating: true,
      currentlyInstallingFile: addonFileId,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, addonFileId)
      .then((installedAddon) => {
        const { updateAvailable } = installedAddon;
        this.setState({
          installed: true,
          installedAddon,
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateAvailable,
          updateError: false,
        });
      })
      .catch(() => {
        this.setState({
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateError: true,
        });
      });
  }

  reinstallAddon() {
    const {
      gameId,
      gameVersion,
      installedAddon,
    } = this.state;
    const installedFile = installedAddon.installedFile._id || installedAddon.installedFile.fileId;
    this.setState({
      currentlyUpdating: true,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, installedAddon, installedFile.fileId)
      .then((newlyInstalledAddon) => {
        const { updateAvailable } = newlyInstalledAddon;
        this.setState({
          installed: true,
          installedAddon: newlyInstalledAddon,
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateAvailable,
          updateError: false,
        });
      })
      .catch(() => {
        this.setState({
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateError: true,
        });
      });
  }

  uninstallAddon() {
    this.setState({ confirmDelete: true });
  }

  confirmUninstall() {
    const {
      gameId,
      gameVersion,
    } = this.state;
    const { addonId } = this.props;
    this.setState({ confirmDelete: false });
    ipcRenderer.invoke('uninstall-addon', gameId, gameVersion, addonId)
      .then(() => {
        this.setState({
          installed: false,
          installedAddon: {},
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateAvailable: false,
          updateError: false,
        });
      })
      .catch(() => {
        this.setState({
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateError: true,
        });
      });
  }

  rejectUninstall() {
    this.setState({ confirmDelete: false });
  }

  updateAddon() {
    const {
      addonVersion,
      gameId,
      gameVersion,
      installedAddon,
    } = this.state;
    const latestFile = getLatestFile(installedAddon, addonVersion);
    this.setState({
      currentlyUpdating: true,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, installedAddon, latestFile.fileId)
      .then((newlyInstalledAddon) => {
        const { updateAvailable } = newlyInstalledAddon;
        this.setState({
          installed: true,
          installedAddon: newlyInstalledAddon,
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateAvailable,
          updateError: false,
        });
      })
      .catch(() => {
        this.setState({
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateError: true,
        });
      });
  }

  installAddon(addon) {
    const {
      gameId,
      gameVersion,
    } = this.state;
    this.setState({
      currentlyUpdating: true,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, null)
      .then((installedAddon) => {
        const { updateAvailable } = installedAddon;
        this.setState({
          installed: true,
          installedAddon,
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateAvailable,
          updateError: false,
        });
      })
      .catch(() => {
        this.setState({
          currentlyUpdating: false,
          currentlyInstallingFile: '',
          updateError: true,
        });
      });
  }

  addonInfoListener(event, addon) {
    const desc = addon.description;
    addon.description = desc.replace(/<a href/g, "<a target='_blank' href");
    this.setState({
      addon,
      isLoading: false,
    });
  }

  render() {
    const {
      activeTab,
      addon,
      confirmDelete,
      currentlyInstallingFile,
      isLoading,
      installed,
      installedAddon,
      installedFile,
    } = this.state;
    const {
      addonId,
      gameId,
      gameVersion,
      handleGoBack,
    } = this.props;
    let categoryNames;
    let authors;
    let downloadCount = '';
    let avatarUrl = '';
    if (addon) {
      if (addon.avatar) {
        avatarUrl = addon.avatar;
      } else if (gameId === 1) {
        avatarUrl = '../img/icons/wow-icon.png';
      } else if (gameId === 2) {
        avatarUrl = '../img/icons/eso-icon.png';
      } else {
        avatarUrl = '../img/app_icon.png';
      }
      if (addon.categories) {
        categoryNames = Array.prototype.map.call(addon.categories, (c) => c.name).toString();
      }

      if (addon.authors) {
        authors = addon.authors;
      } else if (addon.curseAuthors) {
        authors = Array.prototype.map.call(addon.curseAuthors, (a) => a.name).toString();
      } else if (addon.tukuiAuthor) {
        authors = addon.tukuiAuthor;
      } else if (addon.mmouiAuthor) {
        authors = addon.mmouiAuthor;
      }
      if (addon.totalDownloadCount) {
        if (addon.totalDownloadCount > 1000000) {
          downloadCount = addon.totalDownloadCount.toString().slice(0, -5);
          const lastNum = downloadCount.charAt(downloadCount.length - 1);
          downloadCount = `${downloadCount.slice(0, -1)}.${lastNum}M`;
        } else if (addon.totalDownloadCount > 1000) {
          downloadCount = addon.totalDownloadCount.toString().slice(0, -2);
          const lastNum = downloadCount.charAt(downloadCount.length - 1);
          downloadCount = `${downloadCount.slice(0, -1)}.${lastNum}K`;
        } else {
          downloadCount = addon.totalDownloadCount.toString();
        }
      }
    }

    return (
      <div className="GameDetailsWindow">
        {isLoading
          ? <LoadingSpinner />
          : ''}
        {confirmDelete && !isLoading
          ? (
            <ConfirmationDialog
              message={`Are you sure you want to uninstall ${addon.addonName}?`}
              accept={this.confirmUninstall}
              reject={this.rejectUninstall}
            />
          )
          : ''}
        {!confirmDelete && !isLoading
          ? (
            <div>
              <SimpleBar scrollbarMaxSize={50} className="addon-details-window">
                <Row className="addon-details-top-menu">
                  <Col xs="3"><GameMenuButton handleClick={handleGoBack} type="Back" /></Col>
                </Row>
                <Row className="addon-info-row">
                  <Col xs="3" className="addon-icon">
                    <img src={avatarUrl} className="addon-details-icon" alt="Addont icon" />
                  </Col>
                  <Col xs="9" lg="8" className="addon-info">
                    <Row>
                      <Col xs="10">
                        <span className="addon-info-bold">{addon.addonName}</span>
                        {addon.addonName ? (
                          <span className="addon-info-small addon-info-pad-left">{installedFile}</span>
                        ) : (
                          <span className="addon-info-small addon-info-pad-left" />

                        )}
                      </Col>
                    </Row>
                    <Row>
                      <Col xs="12" className="addon-info-small">{categoryNames}</Col>
                    </Row>
                    <Row>
                      <Col xs="12" className="addon-additional-info">
                        <span className="addon-info-small">{downloadCount}</span>
                        <span className="addon-info-small addon-info-pad-left">{authors}</span>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs="12" className="addon-info-install-btn">
                        {this.getAddonStatus()}
                        {installed
                          ? <UpdateAddonButton className="uninstall-button" handleClick={this.uninstallAddon} clickData={addonId} type="Uninstall" />
                          : ''}

                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Row className="addon-details-menu">
                  <Col xs={12}>
                    <GameMenuButton className={activeTab === 1 ? 'active-tab' : ''} handleClick={this.toggleDetailSection} clickData={1} type="Overview" />
                    <GameMenuButton className={activeTab === 2 ? 'active-tab' : 'hidden'} handleClick={this.toggleDetailSection} clickData={2} type="Changelog" />
                    <GameMenuButton className={activeTab === 3 ? 'active-tab' : ''} handleClick={this.toggleDetailSection} clickData={3} type="Screenshot" />
                    <GameMenuButton className={activeTab === 4 ? 'active-tab' : ''} handleClick={this.toggleDetailSection} clickData={4} type="Versions" />
                    {
                      addon && addon.addonUrl
                        ? (
                          <Button className="addon-page-link">
                            <a target="_blank" rel="noreferrer" href={addon.addonUrl}>
                              Homepage
                              <i className="addon-page-link-icon fas fa-external-link-alt" />
                            </a>
                          </Button>
                        )
                        : ''
                    }

                  </Col>
                </Row>
                <Row className="addon-details-section">
                  {addon && addon.addonName
                    ? {
                      1: <div dangerouslySetInnerHTML={{ __html: addon.description }} />,
                      2: 'test 2',
                      3: <AddonScreenshotsTab screenshots={addon.screenshots} />,
                      4: <AddonVersionTable
                        gameVersion={gameVersion}
                        addon={addon}
                        installedAddon={installedAddon}
                        currentlyInstallingFile={currentlyInstallingFile}
                        handleInstall={this.installAddonFile}
                      />,
                    }[activeTab]
                    : ''}
                </Row>
              </SimpleBar>
            </div>
          )
          : ''}
      </div>
    );
  }
}

AddonDetailsWindow.propTypes = {
  addonId: PropTypes.string.isRequired,
  gameId: PropTypes.number.isRequired,
  gameVersion: PropTypes.string.isRequired,
  handleGoBack: PropTypes.func.isRequired,
};

export default AddonDetailsWindow;
