import './InstalledAddonsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Button, Form,
} from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import ReactTooltip from 'react-tooltip';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import GameMenuButton from '../Buttons/GameMenuButton';
import LoadingSpinner from '../LoadingSpinner';
import AddonSyncToggle from '../AddonSyncToggle';

import AddonContextMenu from '../../containers/Menus/AddonContextMenu';

const { ipcRenderer } = require('electron');

function timeoutAddon(addon) {
  const {
    currentlyUpdating,
    erroredUpdates,
  } = this.state;
  if (currentlyUpdating.includes(addon.addonId)) {
    const newErroredUpdates = erroredUpdates.slice();
    erroredUpdates.splice(0, 0, addon.addonId);
    const newCurrentlyUpdating = currentlyUpdating.filter((obj) => obj !== addon.addonId);

    this.setState({
      erroredUpdates: newErroredUpdates,
      currentlyUpdating: newCurrentlyUpdating,
    });
  }
}

function sortAddons(a, b) {
  if (a.updateAvailable && !a.ignureUpdate && b.updateAvailable && !b.ignoreUpdate) {
    if (a.addonName > b.addonName) return 1;
    return -1;
  }
  if (a.udateAvailable && a.ignoreUpdate) return -1;
  if (b.updateAvailable && !b.ignoreUpdate) return 1;
  if (((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate)
        && ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate)
  ) {
    if (a.addonName > b.addonName) return 1;
    return -1;
  }
  if ((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate) return -1;
  if ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate) return 1;
  if (a.ignoreUpdate && b.ignoreUpdate) {
    if (a.addonName > b.addonName) return 1;
    return -1;
  }
  if (!a.ignoreUpdate) return -1;
  if (!b.ignoreUpdate) return 1;
  if (a.addonName > b.addonName) return 1;
  return -1;
}

class InstalledAddonsWindow extends React.Component {
  constructor(props) {
    super(props);
    const {
      appUUID,
      backupPending,
      restorePending,
    } = this.props;
    this.state = {
      appUUID,
      backupPending,
      restorePending,
      addonVersion: '',
      installedAddons: [],
      selectedAddon: [],
      filter: '',
      currentlyUpdating: [],
      erroredUpdates: [],
      pendingUpdates: [],
      isRefreshing: false,
      toUpdate: [],
      profile: null,
    };

    this.autoUpdateCompleteListener = this.autoUpdateCompleteListener.bind(this);
    this.authEventListener = this.authEventListener.bind(this);
    this.addonsFoundListener = this.addonsFoundListener.bind(this);
    this.addonsNotFoundListener = this.addonsNotFoundListener.bind(this);
    this.addonInstalledListener = this.addonInstalledListener.bind(this);
    this.addonUninstalledListener = this.addonUninstalledListener.bind(this);
    this.addonSettingsUpdatedListener = this.addonSettingsUpdatedListener.bind(this);
    this.updateAddon = this.updateAddon.bind(this);
    this.contextReinstallAddon = this.contextReinstallAddon.bind(this);
    this.contextUpdateAddon = this.contextUpdateAddon.bind(this);
    this.contextUninstallAddon = this.contextUninstallAddon.bind(this);
    this.updateAll = this.updateAll.bind(this);
    this.handleOnSelect = this.handleOnSelect.bind(this);
    this.openBackupDialog = this.openBackupDialog.bind(this);
    this.changeFilter = this.changeFilter.bind(this);
    this.findAddons = this.findAddons.bind(this);
  }

  componentDidMount() {
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.on('addon-autoupdate-complete', this.autoUpdateCompleteListener);
    ipcRenderer.on('auth-event', this.authEventListener);
    ipcRenderer.on('addons-found', this.addonsFoundListener);
    ipcRenderer.on('no-addons-found', this.addonsNotFoundListener);
    ipcRenderer.on('addon-installed', this.addonInstalledListener);
    ipcRenderer.on('addon-uninstalled', this.addonUninstalledListener);
    ipcRenderer.on('addon-settings-updated', this.addonSettingsUpdatedListener);
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
    const profile = ipcRenderer.sendSync('get-profile');
    const { installedAddons } = gameSettings[gameVersion];
    if (installedAddons && installedAddons.length > 0) {
      installedAddons.forEach((addon, index) => {
        const possibleFiles = addon.latestFiles.filter((file) => (
          file.releaseType <= addon.trackBranch && file.gameVersionFlavor === addonVersion
        ));
        let latest;
        if (possibleFiles && possibleFiles.length > 0) {
          latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
        } else {
          latest = addon.installedFile;
        }
        if (installedAddons[index].fileDate < latest.fileDate) {
          installedAddons[index].updateAvailable = true;
          installedAddons[index].updateFile = latest;
        }

        installedAddons[index].currentlyUpdating = false;
        installedAddons[index].errored = false;
      });
    }
    installedAddons.sort(sortAddons);
    this.setState({
      addonVersion,
      installedAddons,
      isRefreshing: false,
      filter: '',
      profile,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      backupPending,
      gameId,
      gameVersion,
      lastRestoreComplete,
      restorePending,
    } = this.props;
    if (lastRestoreComplete !== prevProps.lastRestoreComplete) {
      ipcRenderer.send('find-addons-async', gameId, gameVersion);
      this.setState({
        currentlyUpdating: [],
        erroredUpdates: [],
        isRefreshing: true,
      });
    }
    if (restorePending !== prevProps.restorePending) {
      this.setState({
        restorePending,
      });
    }
    if (backupPending !== prevProps.backupPending) {
      this.setState({
        backupPending,
      });
    }
    if (gameVersion !== prevProps.gameVersion) {
      const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
      const { installedAddons } = gameSettings[gameVersion];
      const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);

      if (installedAddons && installedAddons.length > 0) {
        installedAddons.forEach((addon, index) => {
          const possibleFiles = addon.latestFiles.filter((file) => (
            file.releaseType <= addon.trackBranch && file.gameVersionFlavor === addonVersion
          ));
          let latest;
          if (possibleFiles && possibleFiles.length > 0) {
            latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
          } else {
            latest = addon.installedFile;
          }
          if (installedAddons[index].fileDate < latest.fileDate) {
            installedAddons[index].updateAvailable = true;
            installedAddons[index].updateFile = latest;
          }

          installedAddons[index].currentlyUpdating = false;
          installedAddons[index].errored = false;
        });
      }
      installedAddons.sort(sortAddons);
      this.setState({
        addonVersion,
        installedAddons,
        isRefreshing: false,
        filter: '',
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('addon-autoupdate-complete', this.autoUpdateCompleteListener);
    ipcRenderer.removeListener('auth-event', this.authEventListener);
    ipcRenderer.removeListener('addons-found', this.addonsFoundListener);
    ipcRenderer.removeListener('no-addons-found', this.addonsNotFoundListener);
    ipcRenderer.removeListener('addon-installed', this.addonInstalledListener);
    ipcRenderer.removeListener('addon-uninstalled', this.addonUninstalledListener);
    ipcRenderer.removeListener('addon-settings-updated', this.addonSettingsUpdatedListener);
  }

  handleOnSelect(row, isSelect) {
    if (isSelect) {
      this.setState({
        selectedAddon: [row.addonId],
      });
    } else {
      this.setState({
        selectedAddon: [],
      });
    }
  }

  updateAddon(addon) {
    const {
      currentlyUpdating,
      pendingUpdates,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('update-addon', gameId, gameVersion, addon);

    const newCurrentlyUpdating = currentlyUpdating.slice();
    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });
    setTimeout(() => {
      timeoutAddon(addon);
    }, 30000);
  }

  updateAll() {
    const {
      installedAddons,
    } = this.state;
    const toUpdate = [];
    const pendingUpdates = [];
    installedAddons.forEach((addon) => {
      if (addon.updateAvailable) {
        toUpdate.push(addon);
        pendingUpdates.push(addon.addonId);
      }
    });
    const updateFirst = toUpdate.pop();
    this.setState({
      toUpdate,
      pendingUpdates,
    }, () => {
      this.updateAddon(updateFirst);
    });
  }

  uninstallAddon() {
    const {
      installedAddons,
      selectedAddon,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const newSelectedAddon = installedAddons.find((obj) => obj.addonId === selectedAddon);
    if (newSelectedAddon) {
      ipcRenderer.send('uninstall-addon', gameId, gameVersion, newSelectedAddon.addonId);
      this.setState({
        selectedAddon: [],
      });
    }
  }

  contextReinstallAddon(addonName) {
    const {
      currentlyUpdating,
      installedAddons,
      pendingUpdates,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const addon = installedAddons.find((obj) => obj.addonName === addonName);
    const installedFile = addon.installedFile.fileId;

    ipcRenderer.send('install-addon-file', gameId, gameVersion, addon, installedFile);
    const newCurrentlyUpdating = currentlyUpdating.slice();
    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });
    setTimeout(() => {
      timeoutAddon(addon);
    }, 30000);
  }

  contextUpdateAddon(addonName) {
    const {
      currentlyUpdating,
      installedAddons,
      pendingUpdates,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const addon = installedAddons.find((obj) => obj.addonName === addonName);
    ipcRenderer.send('update-addon', gameId, gameVersion, addon);

    const newCurrentlyUpdating = currentlyUpdating.slice();
    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });
    setTimeout(() => {
      timeoutAddon(addon);
    }, 30000);
  }

  contextUninstallAddon(addonName) {
    const {
      installedAddons,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const selectedAddon = installedAddons.filter((obj) => obj.addonName === addonName);
    ipcRenderer.send('uninstall-addon', gameId, gameVersion, selectedAddon[0].addonId);
    this.setState({
      selectedAddon: [],
    });
  }

  findAddons() {
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('find-addons-async', gameId, gameVersion);
    this.setState({
      currentlyUpdating: [],
      erroredUpdates: [],
      isRefreshing: true,
    });
  }

  openBackupDialog() {
    const {
      gameId,
      gameVersion,
      openBackupManagementDialog,
    } = this.props;
    const opts = {
      gameId,
      gameVersion,
    };
    openBackupManagementDialog(opts);
  }

  changeFilter(event) {
    this.setState({
      filter: event.target.value,
    });
  }

  autoUpdateCompleteListener() {
    const {
      gameId,
      gameVersion,
    } = this.props;
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const { installedAddons } = gameSettings[gameVersion];
    installedAddons.sort(sortAddons);
    this.setState({
      installedAddons,
    });
  }

  authEventListener(event, type, success) {
    if (success) {
      const profile = ipcRenderer.sendSync('get-profile');
      this.setState({
        profile,
      });
    }
  }

  addonsFoundListener(event, addons, listenerGameVersion) {
    const {
      gameVersion,
    } = this.props;
    addons.sort(sortAddons);
    if (listenerGameVersion === gameVersion) {
      this.setState({
        installedAddons: addons,
        isRefreshing: false,
      });
    }
  }

  addonInstalledListener(event, installedAddon) {
    const {
      currentlyUpdating,
      erroredUpdates,
      installedAddons,
    } = this.state;
    const newInstalledAddons = installedAddons.map((addon) => {
      if (addon.addonId !== installedAddon.addonId) {
        return addon;
      }
      return installedAddon;
    });
    const newCurrentlyUpdating = currentlyUpdating.filter((obj) => obj !== installedAddon.addonId);
    const newErroredUpdates = erroredUpdates.filter((obj) => obj !== installedAddon.addonId);
    const { toUpdate } = this.state;
    const nextUpdate = toUpdate.pop();
    newInstalledAddons.sort(sortAddons);
    this.setState({
      installedAddons: newInstalledAddons,
      currentlyUpdating: newCurrentlyUpdating,
      erroredUpdates: newErroredUpdates,
      toUpdate,
    });
    if (nextUpdate) {
      this.updateAddon(nextUpdate);
    }
  }

  addonUninstalledListener(event, addonId) {
    const {
      installedAddons,
    } = this.state;
    const newInstalledAddons = installedAddons.filter((obj) => obj.addonId !== addonId);
    this.setState({
      installedAddons: newInstalledAddons,
    });
  }

  addonsNotFoundListener(event, listenerGameVersion) {
    const {
      gameVersion,
    } = this.props;
    if (gameVersion === listenerGameVersion) {
      this.setState({
        isRefreshing: false,
      });
    }
  }

  addonSettingsUpdatedListener(event, addonId, newAddon) {
    let { installedAddons } = this.state;
    installedAddons = installedAddons.map((a) => {
      if (a.addonId === addonId) {
        return newAddon;
      }
      return a;
    });
    this.setState({
      installedAddons,
    });
  }

  render() {
    const {
      darkMode,
      gameId,
      gameVersion,
      onSelectAddon,
      toggleActiveTab,
    } = this.props;
    const {
      appUUID,
      addonVersion,
      backupPending,
      currentlyUpdating,
      erroredUpdates,
      filter,
      installedAddons,
      isRefreshing,
      pendingUpdates,
      profile,
      restorePending,
      selectedAddon,
    } = this.state;
    function contextOpenAddonDir(directory) {
      ipcRenderer.send('open-addon-directory', gameId, gameVersion, directory);
    }

    function contextChangeTrackBranch(addon, branch) {
      ipcRenderer.send('change-addon-branch', gameId, gameVersion, addon, branch);
    }

    function contextChangeAutoUpdate(addon, toggle) {
      ipcRenderer.send('change-addon-auto-update', gameId, gameVersion, addon, toggle);
    }

    function contextChangeIgnoreUpdate(addon, toggle) {
      ipcRenderer.send('change-addon-ignore-update', gameId, gameVersion, addon, toggle);
    }

    const noTableData = () => (
      <div className="no-data-label">No Addons Matching That Filter</div>);
    const noAddonsInstalled = () => (
      <div className="no-data-label no-addons">
        <p>It looks like you don&apos;t have any addons installed yet!</p>
        <p>
          Try hitting
          <span role="button" tabIndex="0" className="no-addons-link" onClick={this.findAddons} onKeyPress={this.findAddons}>Refresh</span>
          {' '}
          or
          <span role="button" tabIndex="0" className="no-addons-link" onClick={() => toggleActiveTab('browse')} onKeyPress={() => toggleActiveTab('browse')}>Browse</span>
          {' '}
          for new ones. You can also restore a
          <span role="button" tabIndex="0" className="no-addons-link" onClick={this.openBackupDialog} onKeyPress={this.openBackupDialog}>Backup</span>
          {' '}
          if you have one or use your sync profile from another
          computer if you&apos;ve configured one.
        </p>
      </div>
    );
    const columns = [{
      dataField: 'addonId',
      hidden: true,
    }, {
      dataField: 'addonName',
      text: 'Addon',
      sort: true,
      formatter: (cellContent, row) => (
        <div className="browse-addon-title-column">
          {row.primaryCategory
            ? <img className="browse-addon-table-img" alt="Addon icon" src={row.primaryCategory.iconUrl} />
            : ''}
          <span role="button" tabIndex="0" className="browse-addon-name" onClick={() => onSelectAddon(row.addonId)} onKeyPress={() => onSelectAddon(row.addonId)}>{cellContent}</span>
        </div>
      ),
      sortFunc: (a, b, order, dataField, rowA, rowB) => {
        if (rowA.updateAvailable && rowB.updateAvailable) {
          if (order === 'asc') {
            if (a > b) {
              return 1;
            }
            return -1;
          }
          if (a > b) {
            return -1;
          }
          return 1;
        } if (rowA.updateAvailable) {
          return -1;
        } if (rowB.updateAvailable) {
          return 1;
        }
        if (order === 'asc') {
          if (a > b) {
            return 1;
          }
          return -1;
        }
        if (a > b) {
          return -1;
        }
        return 1;
      },
    }, {
      dataField: 'currentlyUpdating',
      hidden: true,
    }, {
      dataField: 'brokenInstallation',
      hidden: true,
    }, {
      dataField: 'unknownUpdate',
      hidden: true,
    }, {
      dataField: 'updateAvailable',
      isDummyField: true,
      text: 'Status',
      sort: true,
      sortFunc: (a, b, order, dataField, rowA, rowB) => {
        if (rowA.updateAvailable && rowB.updateAvailable) {
          if (order === 'asc') {
            if (a > b) {
              return 1;
            }
            return -1;
          }
          if (a > b) {
            return -1;
          }
          return 1;
        } if (rowA.updateAvailable) {
          return -1;
        } if (rowB.updateAvailable) {
          return 1;
        }
        if ((rowA.unknownUpdate || rowA.brokenInstallation)
            && (rowB.unknownUpdate || rowB.brokenInstallation)
        ) {
          if (order === 'asc') {
            if (a > b) {
              return 1;
            }
            return -1;
          }
          if (a > b) {
            return -1;
          }
          return 1;
        } if (rowA.unknownUpdate || rowA.brokenInstallation) {
          return -1;
        } if (rowB.unknownUpdate || rowB.brokenInstallation) {
          return 1;
        }
        if (order === 'asc') {
          if (a > b) {
            return 1;
          }
          return -1;
        }
        if (a > b) {
          return -1;
        }
        return 1;
      },
      formatExtraData: {
        currentlyUpdating,
        erroredUpdates,
        pendingUpdates,
        addonVersion,
      },
      formatter: (cellContent, row, rowIndex, extraData) => {
        const possibleFiles = row.latestFiles.filter((file) => (
          file.releaseType <= row.trackBranch && file.gameVersionFlavor === extraData.addonVersion
        ));
        let latest;
        if (possibleFiles && possibleFiles.length > 0) {
          latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
        } else {
          latest = row.installedFile;
        }

        if (row.ignoreUpdate) {
          return <div><div><span className="label label-danger">Ignored</span></div></div>;
        } if (extraData.erroredUpdates.includes(row.addonId)) {
          return <div><div><span className="label label-danger">ERROR...</span></div></div>;
        } if (extraData.pendingUpdates.includes(row.addonId)) {
          return <div><div><span className="label label-danger">Pending...</span></div></div>;
        } if (extraData.currentlyUpdating.includes(row.addonId)) {
          return <div><div><span className="label label-danger">Updating...</span></div></div>;
        } if (row.unknownUpdate) {
          return (
            <div>
              <p data-tip data-for="unknownVersionTooltip">
                <span className="label label-danger">Unknown Version</span>
              </p>
              <ReactTooltip id="unknownVersionTooltip">
                <span>
                  We couldn&apos;t recognize the installed version.
                  You can try re-installing from the right-click menu.
                </span>
              </ReactTooltip>
            </div>
          );
        } if (row.brokenInstallation) {
          return (
            <div>
              <p data-tip data-for="brokenInstallationTooltip">
                <span className="label label-danger">Missing Files</span>
              </p>
              <ReactTooltip id="brokenInstallationTooltip">
                <span>
                  Your installation is missing files. Try re-installing
                  from the right-click menu.
                </span>
              </ReactTooltip>
            </div>
          );
        } if (row.fileDate < latest.fileDate) {
          return <div><div><UpdateAddonButton handleClick={this.updateAddon} clickData={row} type="Update" /></div></div>;
        }
        return <div><div><span className="label label-danger">Up to Date</span></div></div>;
      },
    }, {
      dataField: 'trackBranch',
      text: 'Latest Version',
      sort: true,
      formatExtraData: {
        addonVersion,
      },
      formatter: (cellContent, row, rowIndex, extraData) => {
        const possibleFiles = row.latestFiles.filter((file) => (
          file.releaseType <= row.trackBranch && file.gameVersionFlavor === extraData.addonVersion
        ));
        if (possibleFiles && possibleFiles.length > 0) {
          const latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
          return <span className="label">{latest.fileName}</span>;
        }
        return <span className="label">{row.installedFile.fileName}</span>;
      },
    }, {
      dataField: 'gameVersion',
      text: 'Game Version',
      sort: true,
      headerStyle: () => ({ minWidth: '115px' }),
    }, {
      dataField: 'author',
      sort: true,
      text: 'Author',
    }];

    const selectRow = {
      mode: 'radio',
      clickToSelect: true,
      selected: selectedAddon,
      onSelect: this.handleOnSelect,
      hideSelectColumn: true,
      classes: 'selected-addon-row installed-addons-row',
    };
    let filteredAddons;
    if (filter === '') {
      filteredAddons = installedAddons;
    } else {
      filteredAddons = installedAddons.filter(
        (addon) => addon.addonName.toLowerCase().includes(filter.toLowerCase()),
      );
    }

    const updateAvailable = installedAddons.some((e) => e.updateAvailable === true);

    return (
      <div className="InstalledAddonsWindow">
        <Row>
          <Col xs={12} className="installed-addon-window-content">
            <div>
              <div className="addons-window">
                <Row className="addon-window-menu">
                  <Col xs={6} sm={7} xl={7} className="button-col">
                    <GameMenuButton handleClick={this.findAddons} type="Refresh" />
                    <GameMenuButton handleClick={this.updateAll} type="Update All" disabled={!updateAvailable} />
                    <GameMenuButton
                      handleClick={() => this.updateAddon(installedAddons.find((a) => (
                        a.addonId === selectedAddon && a.updateAvailable
                      )))}
                      type="Update"
                      disabled={!selectedAddon || !installedAddons.find((a) => (
                        a.addonId === selectedAddon && a.updateAvailable
                      ))}
                    />
                    <GameMenuButton
                      handleClick={this.uninstallAddon}
                      type="Delete"
                      disabled={!(selectedAddon.length > 0)}
                    />
                    <AddonSyncToggle
                      appUUID={appUUID}
                      profile={profile}
                      gameId={gameId}
                      gameVersion={gameVersion}
                      backupPending={backupPending}
                      restorePending={restorePending}
                      darkMode={darkMode}
                    />
                  </Col>
                  <Col xs={4} sm={3} xl={3} className="filter-col">
                    <Form.Group>
                      <Form.Control
                        key={gameVersion}
                        type="text"
                        name="searchFilter"
                        className="addon-search-field filter-field"
                        placeholder="Filter"
                        defaultValue={filter}
                        onChange={this.changeFilter}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={{ span: 2 }}>
                    <Button
                      className="backup-button"
                      onClick={this.openBackupDialog}
                    >
                      Backups
                    </Button>
                  </Col>
                </Row>
                {isRefreshing
                  ? <LoadingSpinner />
                  : (
                    <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? 'addon-table-scrollbar mac' : 'addon-table-scrollbar'}>
                      <Row className="addon-table" id="installed-addon-table">
                        <AddonContextMenu
                          handleUpdate={this.contextUpdateAddon}
                          handleReinstall={this.contextReinstallAddon}
                          handleUninstall={this.contextUninstallAddon}
                          handleChangeBranch={contextChangeTrackBranch}
                          handleChangeAutoUpdate={contextChangeAutoUpdate}
                          handleChangeIgnoreUpdate={contextChangeIgnoreUpdate}
                          handleOpenDir={contextOpenAddonDir}
                          installedAddons={installedAddons}
                        />
                        <Col xs={12}>
                          <BootstrapTable
                            keyField="addonId"
                            data={filteredAddons}
                            columns={columns}
                            selectRow={selectRow}
                            headerClasses="installed-addons-header"
                            rowClasses="installed-addons-row"
                            noDataIndication={
                              installedAddons && installedAddons.length > 0
                                ? noTableData
                                : noAddonsInstalled
                            }
                          />
                        </Col>

                      </Row>
                    </SimpleBar>
                  )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    );
  }
}

InstalledAddonsWindow.propTypes = {
  appUUID: PropTypes.string.isRequired,
  backupPending: PropTypes.bool.isRequired,
  darkMode: PropTypes.bool.isRequired,
  gameId: PropTypes.number.isRequired,
  gameVersion: PropTypes.string.isRequired,
  lastRestoreComplete: PropTypes.object.isRequired,
  onSelectAddon: PropTypes.func.isRequired,
  openBackupManagementDialog: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
  toggleActiveTab: PropTypes.func.isRequired,
};

export default InstalledAddonsWindow;
