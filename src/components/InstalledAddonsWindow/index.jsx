import './InstalledAddonsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Button, Form,
} from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';

import AddonTable from '../AddonTable';
import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import GameMenuButton from '../Buttons/GameMenuButton';
import LoadingSpinner from '../LoadingSpinner';
import AddonSyncToggle from '../AddonSyncToggle';
import ConfirmDeleteDialog from '../Dialogs/ConfirmDeleteDialog';

import AddonContextMenu from '../../containers/Menus/AddonContextMenu';

const { ipcRenderer } = require('electron');

function getLatestFile(addon, addonVersion) {
  let possibleFiles = addon.latestFiles.filter((file) => (
    file.gameVersionFlavor === addonVersion && file.releaseType <= addon.trackBranch
  ));
  if (possibleFiles && possibleFiles.length > 0) {
    return possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
  }
  possibleFiles = addon.latestFiles.filter((file) => file.gameVersionFlavor === addonVersion);
  if (possibleFiles && possibleFiles.length > 0) {
    return possibleFiles.reduce((a, b) => ((a.releaseType < b.releaseType) ? a : b));
  }
  return null;
}

function sortAddons(a, b) {
  if (!a.ignoreUpdate && !b.ignoreUpdate) {
    if (a.updateAvailable && b.updateAvailable) {
      if (a.addonName < b.addonName) return -1;
      return 1;
    }
    if (a.updateAvailable) return -1;
    if (b.updateAvailable) return 1;
    if ((a.unknownUpdate || a.brokenInstallation) && (b.unknownUpdate && b.brokenInstallation)) {
      if (a.addonName < b.addonName) return -1;
      return 1;
    }
    if (a.unknownUpdate || a.brokenInstallation) return -1;
    if (b.unknownUpdate || b.brokenInstallation) return 1;
    if (a.addonName < b.addonName) return -1;
    return 1;
  }
  if (!a.ignoreUpdate) return -1;
  if (!b.ignoreUpdate) return 1;
  if (a.addonName < b.addonName) return -1;
  return 1;
}

class InstalledAddonsWindow extends React.Component {
  constructor(props) {
    super(props);
    const {
      appUUID,
      filter,
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
      filter,
      currentlyUpdating: [],
      erroredUpdates: [],
      pendingUpdates: [],
      isRefreshing: false,
      toUpdate: [],
      profile: null,
      confirmDelete: null,
      pendingUninstall: '',
      uninstallMessage: '',
      uninstallDepsFor: '',
    };
    this.handleSelectAddon = this.handleSelectAddon.bind(this);
    this.clearSearchFilter = this.clearSearchFilter.bind(this);
    this.handleAddonInstallComplete = this.handleAddonInstallComplete.bind(this);
    this.handleAddonInstallFailed = this.handleAddonInstallFailed.bind(this);
    this.addonInstalledListener = this.addonInstalledListener.bind(this);
    this.autoUpdateCompleteListener = this.autoUpdateCompleteListener.bind(this);
    this.authEventListener = this.authEventListener.bind(this);
    this.addonsFoundListener = this.addonsFoundListener.bind(this);
    this.addonsNotFoundListener = this.addonsNotFoundListener.bind(this);
    this.addonSettingsUpdatedListener = this.addonSettingsUpdatedListener.bind(this);
    this.syncCompleteListener = this.syncCompleteListener.bind(this);
    this.updateAddon = this.updateAddon.bind(this);
    this.contextReinstallAddon = this.contextReinstallAddon.bind(this);
    this.contextUpdateAddon = this.contextUpdateAddon.bind(this);
    this.contextUninstallAddon = this.contextUninstallAddon.bind(this);
    this.confirmUninstall = this.confirmUninstall.bind(this);
    this.rejectUninstall = this.rejectUninstall.bind(this);
    this.uninstallAddon = this.uninstallAddon.bind(this);
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
    ipcRenderer.on('addon-installed-automatically', this.addonInstalledListener);
    ipcRenderer.on('auth-event', this.authEventListener);
    ipcRenderer.on('addons-found', this.addonsFoundListener);
    ipcRenderer.on('no-addons-found', this.addonsNotFoundListener);
    ipcRenderer.on('addon-settings-updated', this.addonSettingsUpdatedListener);
    ipcRenderer.on('sync-status', this.syncCompleteListener);
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
    const profile = ipcRenderer.sendSync('get-profile');
    const { installedAddons } = gameSettings[gameVersion];
    if (installedAddons && installedAddons.length > 0) {
      installedAddons.forEach((addon, index) => {
        const latestFile = getLatestFile(addon, addonVersion);

        if (latestFile
            && (installedAddons[index].installedFile.fileDate < latestFile.fileDate
            || installedAddons[index].installedFile.gameVersionFlavor !== addonVersion)) {
          installedAddons[index].updateAvailable = true;
          installedAddons[index].updateFile = latestFile;
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
      profile,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      backupPending,
      filter,
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
          const latestFile = getLatestFile(addon, addonVersion);

          if (latestFile
            && (installedAddons[index].installedFile.fileDate < latestFile.fileDate
            || installedAddons[index].installedFile.gameVersionFlavor !== addonVersion)) {
            installedAddons[index].updateAvailable = true;
            installedAddons[index].updateFile = latestFile;
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
        filter,
        pendingUninstall: '',
        confirmDelete: null,
        uninstallMessage: '',
        uninstallDepsFor: '',
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('addon-autoupdate-complete', this.autoUpdateCompleteListener);
    ipcRenderer.removeListener('addon-installed-automatically', this.addonInstalledListener);
    ipcRenderer.removeListener('auth-event', this.authEventListener);
    ipcRenderer.removeListener('addons-found', this.addonsFoundListener);
    ipcRenderer.removeListener('no-addons-found', this.addonsNotFoundListener);
    ipcRenderer.removeListener('addon-settings-updated', this.addonSettingsUpdatedListener);
    ipcRenderer.removeListener('sync-status', this.syncCompleteListener);
  }

  handleSelectAddon(addonId) {
    const { onSelectAddon } = this.props;
    const { filter } = this.state;
    onSelectAddon(addonId, filter, 1, 1);
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

  handleAddonInstallFailed(addonId) {
    const { erroredUpdates, currentlyUpdating } = this.state;
    const newCurrentlyUpdating = currentlyUpdating.filter((obj) => obj !== addonId);
    erroredUpdates.push(addonId);
    this.setState({
      erroredUpdates,
      currentlyUpdating: newCurrentlyUpdating,
    });
  }

  handleAddonInstallComplete(installedAddon) {
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.invoke('get-installed-addons', gameId, gameVersion)
      .then((installedAddons) => {
        const {
          currentlyUpdating,
          erroredUpdates,
          toUpdate,
        } = this.state;
        installedAddons.sort(sortAddons);
        const newcurrentlyUpdating = currentlyUpdating
          .filter((obj) => obj !== installedAddon.addonId);
        const newErroredUpdates = erroredUpdates.filter((obj) => obj !== installedAddon.addonId);
        const nextUpdate = toUpdate.pop();
        this.setState({
          installedAddons,
          currentlyUpdating: newcurrentlyUpdating,
          erroredUpdates: newErroredUpdates,
          toUpdate,
        });
        if (nextUpdate) {
          this.updateAddon(nextUpdate);
        }
      });
  }

  clearSearchFilter() {
    this.setState({
      filter: '',
    });
  }

  updateAddon(addon) {
    const {
      addonVersion,
      currentlyUpdating,
      pendingUpdates,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;

    const latestFile = getLatestFile(addon, addonVersion);
    const newCurrentlyUpdating = currentlyUpdating.slice();

    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });

    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, latestFile._id)
      .then((installedAddon) => {
        this.handleAddonInstallComplete(installedAddon);
      })
      .catch(() => {
        this.handleAddonInstallFailed(addon.addonId);
      });
  }

  updateAll() {
    const {
      installedAddons,
    } = this.state;
    const toUpdate = [];
    const pendingUpdates = [];
    if (installedAddons) {
      installedAddons.forEach((addon) => {
        if (addon.updateAvailable) {
          toUpdate.push(addon);
          pendingUpdates.push(addon.addonId);
        }
      });
      const nextUpdate = toUpdate.pop();
      this.setState({
        toUpdate,
        pendingUpdates,
      }, () => {
        this.updateAddon(nextUpdate);
      });
    }
  }

  uninstallAddon() {
    const {
      selectedAddon,
      installedAddons,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const selected = installedAddons.find((obj) => obj.addonId === selectedAddon[0]);
    ipcRenderer.invoke('get-addons-dependent-on', gameId, gameVersion, selected.addonId)
      .then((dependencyFor) => {
        if (dependencyFor) {
          const depList = [];
          dependencyFor.forEach((dep) => {
            depList.push(dep.addonName);
          });
          const message = `Are you sure you want to uninstall ${selected.addonName}? This is a dependency for the following addons:`;
          this.setState({
            pendingUninstall: selected.addonId,
            uninstallMessage: message,
            uninstallDepsFor: depList.join(', '),
            confirmDelete: 'dependency',
          });
        } else {
          ipcRenderer.invoke('uninstall-addon', gameId, gameVersion, selected.addonId)
            .then(() => {
              ipcRenderer.invoke('get-installed-addons', gameId, gameVersion)
                .then((newInstalledAddons) => {
                  newInstalledAddons.sort(sortAddons);
                  this.setState({
                    selectedAddon: [],
                    installedAddons: newInstalledAddons,
                  });
                });
            })
            .catch(() => {
              this.handleAddonInstallFailed(selected.addonId);
            });
        }
      });
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
    const newCurrentlyUpdating = currentlyUpdating.slice();
    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, addon.installedFile.fileId)
      .then((installedAddon) => {
        this.handleAddonInstallComplete(installedAddon);
      })
      .catch(() => {
        this.handleAddonInstallFailed(addon.addonId);
      });
  }

  contextUpdateAddon(addonName) {
    const {
      addonVersion,
      currentlyUpdating,
      installedAddons,
      pendingUpdates,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const addon = installedAddons.find((obj) => obj.addonName === addonName);
    const latestFile = getLatestFile(addon, addonVersion);
    const newCurrentlyUpdating = currentlyUpdating.slice();
    const newPendingUpdates = pendingUpdates.filter((obj) => obj !== addon.addonId);
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
      pendingUpdates: newPendingUpdates,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, latestFile._id)
      .then((installedAddon) => {
        this.handleAddonInstallComplete(installedAddon);
      })
      .catch(() => {
        this.handleAddonInstallFailed(addon.addonId);
      });
  }

  rejectUninstall() {
    this.setState({
      confirmDelete: false,
      pendingUninstall: '',
      uninstallMessage: '',
      uninstallDepsFor: '',
    });
  }

  confirmUninstall() {
    const {
      pendingUninstall,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    this.setState({
      pendingUninstall: '',
      confirmDelete: null,
      uninstallMessage: '',
      uninstallDepsFor: '',
    });
    ipcRenderer.invoke('uninstall-addon', gameId, gameVersion, pendingUninstall)
      .then(() => {
        ipcRenderer.invoke('get-installed-addons', gameId, gameVersion)
          .then((newInstalledAddons) => {
            newInstalledAddons.sort(sortAddons);
            this.setState({
              selectedAddon: [],
              installedAddons: newInstalledAddons,
            });
          });
      })
      .catch(() => {
        this.handleAddonInstallFailed(pendingUninstall);
      });
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
    ipcRenderer.invoke('get-addons-dependent-on', gameId, gameVersion, selectedAddon[0].addonId)
      .then((dependencyFor) => {
        if (dependencyFor) {
          const depList = [];
          dependencyFor.forEach((dep) => {
            depList.push(dep.addonName);
          });
          const message = `Are you sure you want to uninstall ${addonName}? This is a dependency for the following addons:`;
          this.setState({
            pendingUninstall: selectedAddon[0].addonId,
            uninstallMessage: message,
            uninstallDepsFor: depList.join(', '),
            confirmDelete: 'dependency',
          });
        } else {
          ipcRenderer.invoke('uninstall-addon', gameId, gameVersion, selectedAddon[0].addonId)
            .then(() => {
              ipcRenderer.invoke('get-installed-addons', gameId, gameVersion)
                .then((newInstalledAddons) => {
                  newInstalledAddons.sort(sortAddons);
                  this.setState({
                    selectedAddon: [],
                    installedAddons: newInstalledAddons,
                  });
                });
            })
            .catch(() => {
              this.handleAddonInstallFailed(selectedAddon[0].addonId);
            });
        }
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

  addonInstalledListener(_event, installedAddon) {
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (installedAddon.gameId === gameId && installedAddon.gameVersion === gameVersion) {
      this.handleAddonInstallComplete(installedAddon);
    }
  }

  syncCompleteListener(syncedGameId, syncedGameVersion, status) {
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (gameId === syncedGameId && gameVersion === syncedGameVersion && status === 'complete') {
      const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
      const { installedAddons } = gameSettings[gameVersion];
      installedAddons.sort(sortAddons);
      this.setState({
        installedAddons,
      });
    }
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
    const {
      addonVersion,
    } = this.state;
    if (addons && addons.length > 0) {
      addons.forEach((addon, index) => {
        const latestFile = getLatestFile(addon, addonVersion);

        if (latestFile
            && (addons[index].installedFile.fileDate < latestFile.fileDate
            || addons[index].installedFile.gameVersionFlavor !== addonVersion)) {
          addons[index].updateAvailable = true;
          addons[index].updateFile = latestFile;
        }

        addons[index].currentlyUpdating = false;
        addons[index].errored = false;
      });
    }
    addons.sort(sortAddons);
    if (listenerGameVersion === gameVersion) {
      this.setState({
        installedAddons: addons,
        isRefreshing: false,
      });
    }
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
      toggleActiveTab,
      openWowExtras,
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
      confirmDelete,
      uninstallMessage,
      uninstallDepsFor,
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
          {' '}
          <span role="button" tabIndex="0" className="no-addons-link" onClick={this.findAddons} onKeyPress={this.findAddons}>Refresh</span>
          {' '}
          or
          {' '}
          <span role="button" tabIndex="0" className="no-addons-link" onClick={() => toggleActiveTab('browse')} onKeyPress={() => toggleActiveTab('browse')}>Browse</span>
          {' '}
          for new ones. You can also restore a
          {' '}
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
      formatExtraData: gameId,
      formatter: (cellContent, row, rowIndex, formatExtraData) => {
        let avatarUrl;
        if (row.avatar) {
          avatarUrl = row.avatar;
        } else if (formatExtraData === 1) {
          avatarUrl = '../img/icons/wow-icon.png';
        } else if (formatExtraData === 2) {
          avatarUrl = '../img/icons/eso-icon.png';
        } else {
          avatarUrl = '../img/app_icon_light.png';
        }
        return (
          <div className="installed-addon-title-column">
            <img className="addon-table-img" alt="Addon icon" src={avatarUrl} />
            <div className="addon-name-section"><span role="button" tabIndex="0" className="addon-name" onClick={() => this.handleSelectAddon(row.addonId)} onKeyPress={() => this.handleSelectAddon(row.addonId)}>{cellContent}</span></div>
          </div>
        );
      },
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
        const latestFile = getLatestFile(row, extraData.addonVersion);

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
        } if (latestFile
          && (row.installedFile.fileDate < latestFile.fileDate
            || row.installedFile.gameVersionFlavor !== extraData.addonVersion)) {
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
        const latestFile = getLatestFile(row, extraData.addonVersion);
        if (latestFile) {
          return <span className="label">{latestFile.fileName}</span>;
        }
        return <span className="label">No File Identified</span>;
      },
    }, {
      dataField: 'gameVersion',
      text: 'Patch',
      sort: true,
      headerStyle: () => ({ minWidth: '115px' }),
      formatter: (cellContent, row) => row.installedFile.gameVersion,
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

    function addonUpdateAvailable(addon) {
      const latestFile = getLatestFile(addon, addonVersion);
      if (latestFile && latestFile.fileDate > addon.installedFile.fileDate) {
        return true;
      }
      return false;
    }

    const updateAvailable = installedAddons.some((e) => addonUpdateAvailable(e) === true);

    return (
      <div id="InstalledAddonsWindow">
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
                        a.addonId === selectedAddon[0]
                      )))}
                      type="Update"
                      disabled={!selectedAddon || !installedAddons.find((a) => (
                        a.addonId === selectedAddon[0] && addonUpdateAvailable(a)
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
                    {filter && filter !== ''
                      ? (
                        <div
                          className="search-filter-clear"
                          role="button"
                          tabIndex="0"
                          onClick={this.clearSearchFilter}
                          onKeyPress={this.clearSearchFilter}
                        >
                          <i className="fas fa-times-circle" />
                        </div>
                      )
                      : ''}
                    <Form.Group>
                      <Form.Control
                        type="text"
                        name="searchFilter"
                        className="addon-search-field filter-field"
                        placeholder="Filter"
                        value={filter}
                        onChange={this.changeFilter}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={{ span: 2 }}>
                    {gameId === 1
                      ? (
                        <div
                          className="extras-link"
                          role="button"
                          tabIndex="0"
                          onClick={() => openWowExtras(gameVersion)}
                          onKeyPress={() => openWowExtras(gameVersion)}
                        >
                          <i className="fas fa-cogs extras-icon" />
                        </div>
                      )
                      : ''}
                    <Button
                      className="backup-button"
                      onClick={this.openBackupDialog}
                    >
                      Backups
                    </Button>
                  </Col>
                </Row>
                <div>
                  {confirmDelete
                    ? (
                      <ConfirmDeleteDialog
                        message={uninstallMessage}
                        boldMessage={uninstallDepsFor}
                        accept={this.confirmUninstall}
                        reject={this.rejectUninstall}
                      />
                    )
                    : ''}
                </div>

                {isRefreshing && (!filteredAddons || filteredAddons.length === 0)
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
                          <AddonTable
                            addons={filteredAddons}
                            columns={columns}
                            selectRow={selectRow}
                            keyField="addonId"
                            noTableData={
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
  filter: PropTypes.string,
  lastRestoreComplete: PropTypes.object.isRequired,
  onSelectAddon: PropTypes.func.isRequired,
  openBackupManagementDialog: PropTypes.func.isRequired,
  openWowExtras: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
  toggleActiveTab: PropTypes.func.isRequired,
};

InstalledAddonsWindow.defaultProps = {
  filter: '',
};

export default InstalledAddonsWindow;
