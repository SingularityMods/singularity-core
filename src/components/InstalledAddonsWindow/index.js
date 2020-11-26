import './InstalledAddonsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';

import * as React from 'react';
import { Row, Col, Button, Form } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
const { ipcRenderer } = require('electron');
import ReactTooltip from 'react-tooltip';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import GameMenuButton from '../Buttons/GameMenuButton';
import LoadingSpinner from '../LoadingSpinner';
import AddonSyncToggle from '../AddonSyncToggle';

import AddonContextMenu from '../../containers/Menus/AddonContextMenu';

export default class InstalledAddonsWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            appUUID: this.props.appUUID,
            gameId: this.props.gameId,
            gameVersion: this.props.gameVersion,
            backupPending: this.props.backupPending,
            restorePending: this.props.restorePending,
            addonVersion: '',
            installedAddons: [],
            selectedAddon: [],
            filter: '',
            errorMessage: '',
            currentlyUpdating: [],
            erroredUpdates: [],
            pendingUpdates: [],
            isRefreshing: false,
            toUpdate: [],
            profile: null,
            selectedBackup: null,
            darkMode: false
        }

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
        this.contextChangeTrackBranch = this.contextChangeTrackBranch.bind(this);
        this.contextChangeAutoUpdate = this.contextChangeAutoUpdate.bind(this);
        this.contextChangeIgnoreUpdate =this.contextChangeIgnoreUpdate.bind(this);
        this.contextOpenAddonDir = this.contextOpenAddonDir.bind(this);
        this.updateAll = this.updateAll.bind(this);
        this.handleOnSelect = this.handleOnSelect.bind(this);
        this.openBackupDialog = this.openBackupDialog.bind(this);
        this.changeFilter = this.changeFilter.bind(this);
        this.findAddons = this.findAddons.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.lastRestoreComplete !== prevProps.lastRestoreComplete) {
            ipcRenderer.send('find-addons-async', this.state.gameId, this.state.gameVersion);
            this.setState({
                currentlyUpdating: [],
                erroredUpdates: [],
                isRefreshing: true
            })
        }
        if (this.props.restorePending !== prevProps.restorePending) {
            this.setState({
                restorePending: this.props.restorePending
            });
        }
        if (this.props.backupPending !== prevProps.backupPending) {
            this.setState({
                backupPending: this.props.backupPending
            });
        }
        if (this.props.gameVersion !== prevProps.gameVersion) {
            const gameSettings = ipcRenderer.sendSync('get-game-settings', this.props.gameId);
            let installedAddons = gameSettings[this.props.gameVersion].installedAddons;
            const addonVersion = ipcRenderer.sendSync('get-game-addon-version', this.props.gameId, this.props.gameVersion);

            if (installedAddons && installedAddons.length > 0) {
                installedAddons.forEach((addon,index) => {
                    let possibleFiles = addon.latestFiles.filter((file) => {
                        return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
                    });
                    if (possibleFiles && possibleFiles.length > 0) {
                        var latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                    } else {
                        var latest = addon.installedFile;
                    }
                    if (installedAddons[index].fileDate < latest.fileDate) {
                        installedAddons[index].updateAvailable = true;
                        installedAddons[index].updateFile = latest;
                    }
    
                    installedAddons[index].currentlyUpdating = false;
                    installedAddons[index].errored = false;
                })
            }
            this.setState({
                gameId: this.props.gameId,
                gameVersion: this.props.gameVersion,
                addonVersion: addonVersion,
                installedAddons: installedAddons,
                isRefreshing: false,
                filter: '',
            })
        }
    }

    componentDidMount() {
        ipcRenderer.on('addon-autoupdate-complete', this.autoUpdateCompleteListener);
        ipcRenderer.on('auth-event', this.authEventListener);
        ipcRenderer.on('addons-found', this.addonsFoundListener);
        ipcRenderer.on('no-addons-found', this.addonsNotFoundListener);
        ipcRenderer.on('addon-installed', this.addonInstalledListener);
        ipcRenderer.on('addon-uninstalled', this.addonUninstalledListener);
        ipcRenderer.on('addon-settings-updated', this.addonSettingsUpdatedListener);
        const darkMode = ipcRenderer.sendSync('is-dark-mode');
        const gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        const addonVersion = ipcRenderer.sendSync('get-game-addon-version', this.props.gameId, this.props.gameVersion);
        let profile = ipcRenderer.sendSync('get-profile');
        var installedAddons = gameSettings[this.state.gameVersion].installedAddons;
        if (installedAddons && installedAddons.length > 0) {
            installedAddons.forEach((addon,index) => {
                let possibleFiles = addon.latestFiles.filter((file) => {
                    return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
                });
                if (possibleFiles && possibleFiles.length > 0) {
                    var latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                } else {
                    var latest = addon.installedFile;
                }
                if (installedAddons[index].fileDate < latest.fileDate) {
                    installedAddons[index].updateAvailable = true;
                    installedAddons[index].updateFile = latest;
                }

                installedAddons[index].currentlyUpdating = false;
                installedAddons[index].errored = false;
            })
        }
        installedAddons.sort( (a,b) => (
                ((a.updateAvailable && !a.ignoreUpdate) && (b.updateAvailable && !b.ignoreUpdate))
                            ? (a.addonName > b.addonName)
                                ? 1
                                : -1
                            : (a.updateAvailable && !a.ignoreUpdate)
                                ? -1
                                : (b.updateAvailable && !b.ignoreUpdate)
                                    ? 1
                                    : (((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate) && ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate))
                                        ? (a.addonName > b.addonName)
                                            ? 1
                                            : -1
                                        : ((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate)
                                            ? -1
                                            : ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate)
                                                ? 1
                                                : (!a.ignoreUpdate && !b.ignoreUpdate)
                                                    ? (a.addonName > b.addonName)
                                                        ? 1
                                                        : -1
                                                    : !a.ignoreUpdate
                                                        ? -1
                                                        : !b.ignoreUpdate
                                                            ? 1
                                                            : (a.addonName > b.addonName)
                                                                ? 1
                                                                : -1
        ))
        this.setState({
            addonVersion: addonVersion,
            installedAddons: installedAddons,
            isRefreshing: false,
            filter: '',
            profile: profile,
            darkMode: darkMode
        });
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

    autoUpdateCompleteListener(event) {
        const gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        var installedAddons = gameSettings[this.state.gameVersion].installedAddons;
        installedAddons.sort( (a,b) => (
            ((a.updateAvailable && !a.ignoreUpdate) && (b.updateAvailable && !b.ignoreUpdate))
                        ? (a.addonName > b.addonName)
                            ? 1
                            : -1
                        : (a.updateAvailable && !a.ignoreUpdate)
                            ? -1
                            : (b.updateAvailable && !b.ignoreUpdate)
                                ? 1
                                : (((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate) && ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate))
                                    ? (a.addonName > b.addonName)
                                        ? 1
                                        : -1
                                    : ((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate)
                                        ? -1
                                        : ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate)
                                            ? 1
                                            : (!a.ignoreUpdate && !b.ignoreUpdate)
                                                ? (a.addonName > b.addonName)
                                                    ? 1
                                                    : -1
                                                : !a.ignoreUpdate
                                                    ? -1
                                                    : !b.ignoreUpdate
                                                        ? 1
                                                        : (a.addonName > b.addonName)
                                                            ? 1
                                                            : -1
        ))
        this.setState({
            installedAddons: installedAddons,
        })
    }

    authEventListener(event,type, success, message) {
        if (success) {
            let profile = ipcRenderer.sendSync('get-profile');
            this.setState({
                profile: profile
            })
        }
    }

    addonsFoundListener(event, addons, gameVersion) {
        addons.sort( (a,b) => (
                ((a.updateAvailable && !a.ignoreUpdate) && (b.updateAvailable && !b.ignoreUpdate))
                            ? (a.addonName > b.addonName)
                                ? 1
                                : -1
                            : (a.updateAvailable && !a.ignoreUpdate)
                                ? -1
                                : (b.updateAvailable && !b.ignoreUpdate)
                                    ? 1
                                    : (((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate) && ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate))
                                        ? (a.addonName > b.addonName)
                                            ? 1
                                            : -1
                                        : ((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate)
                                            ? -1
                                            : ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate)
                                                ? 1
                                                : (!a.ignoreUpdate && !b.ignoreUpdate)
                                                    ? (a.addonName > b.addonName)
                                                        ? 1
                                                        : -1
                                                    : !a.ignoreUpdate
                                                        ? -1
                                                        : !b.ignoreUpdate
                                                            ? 1
                                                            : (a.addonName > b.addonName)
                                                                ? 1
                                                                : -1
        ))
        if (gameVersion == this.state.gameVersion) {
            this.setState({
                installedAddons: addons,
                isRefreshing: false
            })
        }
    }

    addonInstalledListener(event, installedAddon) {
        let installedAddons = this.state.installedAddons.map((addon) => {
            if (addon.addonId !== installedAddon.addonId) {
                return addon;
            } else {
                return installedAddon;
            }
        })
        let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
            return obj !== installedAddon.addonId;
        })
        let erroredUpdates = this.state.erroredUpdates.filter(obj => {
            return obj !== installedAddon.addonId;
        })
        let toUpdate = this.state.toUpdate;
        let nextUpdate = toUpdate.pop();

        installedAddons.sort( (a,b) => (
                ((a.updateAvailable && !a.ignoreUpdate) && (b.updateAvailable && !b.ignoreUpdate))
                            ? (a.addonName > b.addonName)
                                ? 1
                                : -1
                            : (a.updateAvailable && !a.ignoreUpdate)
                                ? -1
                                : (b.updateAvailable && !b.ignoreUpdate)
                                    ? 1
                                    : ((a.unknownUpdate || a.brokenInstallation) && (b.unknownUpdate || b.brokenInstallation))
                                        ? (a.addonName > b.addonName)
                                            ? 1
                                            : -1
                                        : (a.unknownUpdate || a.brokenInstallation)
                                            ? -1
                                            : (b.unknownUpdate || b.brokenInstallation)
                                                ? 1
                                                : (a.addonName > b.addonName)
                                                    ? 1
                                                    : -1
        ))
        this.setState({
            installedAddons: installedAddons,
            currentlyUpdating: currentlyUpdating,
            erroredUpdates: erroredUpdates,
            toUpdate:toUpdate
        });
        if (nextUpdate) {
            this.updateAddon(nextUpdate);
        }
        
    }

    addonUninstalledListener(event, addonId) {
        let installedAddons = this.state.installedAddons.filter(obj => {
            return obj.addonId !== addonId;
        });
        this.setState({
            installedAddons: installedAddons
        });
    }

    addonsNotFoundListener(event, gameVersion) {
        if (gameVersion == this.state.gameVersion) {
            this.setState({
                errorMessage: 'Could not locate any addons',
                isRefreshing: false
            });
        }
    }


    addonSettingsUpdatedListener(event, addonId, newAddon) {
        let installedAddons = this.state.installedAddons;
        installedAddons = installedAddons.map(a => {
            if (a.addonId === addonId) {
                return newAddon;
            } else {
                return a;
            }
        });
        installedAddons.sort( (a,b) => (
                ((a.updateAvailable && !a.ignoreUpdate) && (b.updateAvailable && !b.ignoreUpdate))
                            ? (a.addonName > b.addonName)
                                ? 1
                                : -1
                            : (a.updateAvailable && !a.ignoreUpdate)
                                ? -1
                                : (b.updateAvailable && !b.ignoreUpdate)
                                    ? 1
                                    : (((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate) && ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate))
                                        ? (a.addonName > b.addonName)
                                            ? 1
                                            : -1
                                        : ((a.unknownUpdate || a.brokenInstallation) && !a.ignoreUpdate)
                                            ? -1
                                            : ((b.unknownUpdate || b.brokenInstallation) && !b.ignoreUpdate)
                                                ? 1
                                                : (!a.ignoreUpdate && !b.ignoreUpdate)
                                                    ? (a.addonName > b.addonName)
                                                        ? 1
                                                        : -1
                                                    : !a.ignoreUpdate
                                                        ? -1
                                                        : !b.ignoreUpdate
                                                            ? 1
                                                            : (a.addonName > b.addonName)
                                                                ? 1
                                                                : -1
        ))
        this.setState({
            installedAddons: installedAddons
        });
    }

    findAddons() {
        ipcRenderer.send('find-addons-async', this.state.gameId, this.state.gameVersion);
        this.setState({
            currentlyUpdating: [],
            erroredUpdates: [],
            isRefreshing: true
        })
    }

    contextReinstallAddon(addonName) {
        let addon = this.state.installedAddons.find(obj => {return obj.addonName === addonName})
        let installedFile = addon.installedFile.fileId;

        ipcRenderer.send('install-addon-file', this.state.gameId, this.state.gameVersion, addon, installedFile);
        let currentlyUpdating = this.state.currentlyUpdating.slice();
        let pendingUpdates = this.state.pendingUpdates.filter(obj => {
            return obj !== addon.addonId;
        })
        currentlyUpdating.splice(0,0,addon.addonId)
        this.setState({
            currentlyUpdating: currentlyUpdating,
            pendingUpdates: pendingUpdates
        });
        setTimeout(() => {
            if (this.state.currentlyUpdating.includes(addon.addonId)) {
                let erroredUpdates = this.state.erroredUpdates.slice();
                erroredUpdates.splice(0, 0, addon.addonId);
                let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
                    return obj !== addon.addonId;
                })

                this.setState({
                    erroredUpdates: erroredUpdates,
                    currentlyUpdating: currentlyUpdating
                });
            }
        }, 30000);
    }

    contextUpdateAddon(addonName) {
        let addon = this.state.installedAddons.find(obj => {return obj.addonName === addonName})
        ipcRenderer.send('update-addon', this.state.gameId, this.state.gameVersion, addon);
        
        let currentlyUpdating = this.state.currentlyUpdating.slice();
        let pendingUpdates = this.state.pendingUpdates.filter(obj => {
            return obj !== addon.addonId;
        })
        currentlyUpdating.splice(0,0,addon.addonId)
        this.setState({
            currentlyUpdating: currentlyUpdating,
            pendingUpdates: pendingUpdates
        });
        setTimeout(() => {
            if (this.state.currentlyUpdating.includes(addon.addonId)) {
                let erroredUpdates = this.state.erroredUpdates.slice();
                erroredUpdates.splice(0, 0, addon.addonId);
                let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
                    return obj !== addon.addonId;
                })

                this.setState({
                    erroredUpdates: erroredUpdates,
                    currentlyUpdating: currentlyUpdating
                });
            }
        }, 30000);
    }
    
    contextUninstallAddon (addonName) {
        let selectedAddon = this.state.installedAddons.filter(obj => {
            return obj.addonName == addonName
        })
        ipcRenderer.send('uninstall-addon', this.state.gameId, this.state.gameVersion, selectedAddon[0].addonId);
        this.setState({
            selectedAddon: []
        })
    }

    contextOpenAddonDir (directory) {
        ipcRenderer.send('open-addon-directory', this.state.gameId, this.state.gameVersion, directory);
    }

    contextChangeTrackBranch (addon,branch) {
        ipcRenderer.send('change-addon-branch', this.state.gameId, this.state.gameVersion, addon, branch);
    }

    contextChangeAutoUpdate (addon,toggle) {
        ipcRenderer.send('change-addon-auto-update', this.state.gameId, this.state.gameVersion, addon, toggle);
    }

    contextChangeIgnoreUpdate (addon,toggle) {
        ipcRenderer.send('change-addon-ignore-update', this.state.gameId, this.state.gameVersion, addon, toggle);
    }

    updateAddon(addon) {
        ipcRenderer.send('update-addon', this.state.gameId, this.state.gameVersion, addon);
        
        let currentlyUpdating = this.state.currentlyUpdating.slice();
        let pendingUpdates = this.state.pendingUpdates.filter(obj => {
            return obj !== addon.addonId;
        })
        currentlyUpdating.splice(0,0,addon.addonId)
        this.setState({
            currentlyUpdating: currentlyUpdating,
            pendingUpdates: pendingUpdates
        });
        setTimeout(() => {
            if (this.state.currentlyUpdating.includes(addon.addonId)) {
                let erroredUpdates = this.state.erroredUpdates.slice();
                erroredUpdates.splice(0, 0, addon.addonId);
                let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
                    return obj !== addon.addonId;
                })

                this.setState({
                    erroredUpdates: erroredUpdates,
                    currentlyUpdating: currentlyUpdating
                });
            }
        }, 30000);
    }


    updateAll() {
        var toUpdate = [];
        var pendingUpdates = [];
        this.state.installedAddons.forEach((addon) => {
            if (addon.updateAvailable) {
                toUpdate.push(addon);
                pendingUpdates.push(addon.addonId);
            }
        })
        var updateFirst = toUpdate.pop();
        this.setState({
            toUpdate: toUpdate,
            pendingUpdates: pendingUpdates
        }, () => {
            this.updateAddon(updateFirst);
        });
    }

    uninstallAddon() {
        let selectedAddon = this.state.installedAddons.find(obj => {
            return obj.addonId == this.state.selectedAddon
        })
        if (selectedAddon) {
            ipcRenderer.send('uninstall-addon', this.state.gameId, this.state.gameVersion, selectedAddon.addonId);
            this.setState({
                selectedAddon: []
            })
        }
    }

    handleOnSelect(row, isSelect) {
        if (isSelect) {
            this.setState({
                selectedAddon: [row.addonId]
            })
        } else {
            this.setState( {
                selectedAddon: []
            })
        }
    }

    openBackupDialog() {
        let opts = {
            gameId: this.state.gameId,
            gameVersion: this.state.gameVersion}
        this.props.openBackupManagementDialog(opts);
    }

    changeFilter(event) {
        this.setState({
            filter: event.target.value
        });
    }

    render() {
        const noTableData = () => {
            return(
            <div className="no-data-label">No Addons Matching That Filter</div>)
        }
        const noAddonsInstalled = () => {
            return (
                <div className="no-data-label no-addons">
                    <p>It looks like you don't have any addons installed yet!</p>
                    <p>Try hitting <span className="no-addons-link" onClick={this.findAddons} >Refresh</span> or <span className="no-addons-link" onClick={() => this.props.toggleActiveTab('browse')}>Browse</span> for new ones. You can also restore a <span className="no-addons-link" onClick={this.openBackupDialog}>Backup</span> if you have one or use your sync profile from another computer if you've configured one.</p>
                </div>
            )
        }
        const columns = [{
            dataField: 'addonId',
            hidden: true
        }, {
            dataField: 'addonName',
            text: 'Addon',
            sort: true,
            formatter: (cellContent, row, rowIndex) => {
                return (
                    <div className="browse-addon-title-column">
                        {row.primaryCategory
                            ? <img className="browse-addon-table-img" src={row.primaryCategory.iconUrl} />
                            :''
                        }
                        <a href="#" className="browse-addon-name" onClick={() => this.props.onSelectAddon(row.addonId)}>{cellContent}</a>
                    </div>
                );
            },/*
            sortCaret: (order, column) => {
                if (!order) return (<span>&nbsp;&nbsp;Desc/Asc</span>);
                else if (order === 'asc') return (<span>&nbsp;&nbsp;Desc/<font color="red">Asc</font></span>);
                else if (order === 'desc') return (<span>&nbsp;&nbsp;<font color="red">Desc</font>/Asc</span>);
                return null;
            },*/
            sortFunc: (a, b, order, dataField, rowA, rowB) => {
                if (rowA.updateAvailable && rowB.updateAvailable) {
                    if (order === 'asc') {
                        if (a > b) {
                            return 1
                        }
                        return -1
                    }
                    if (a > b) {
                        return -1
                    }
                    return 1
                } else if (rowA.updateAvailable) {
                    return -1;
                } else if (rowB.updateAvailable) {
                    return 1;
                } else {
                    if (order === 'asc') {
                        if (a > b) {
                            return 1
                        }
                        return -1
                    }
                    if (a > b) {
                        return -1
                    }
                    return 1
                }
            }
        }, {
            dataField: 'currentlyUpdating',
            hidden: true
        }, {
            dataField: 'brokenInstallation',
            hidden: true
        }, {
            dataField: 'unknownUpdate',
            hidden: true
        }, {
            dataField: 'updateAvailable',
            isDummyField: true,
            text: 'Status',
            sort: true,
            sortFunc: (a, b, order, dataField, rowA, rowB) => {
                if (rowA.updateAvailable && rowB.updateAvailable) {
                    if (order === 'asc') {
                        if (a > b) {
                            return 1
                        }
                        return -1
                    }
                    if (a > b) {
                        return -1
                    }
                    return 1
                } else if (rowA.updateAvailable) {
                    return -1;
                } else if (rowB.updateAvailable) {
                    return 1;
                } else {
                    if ((rowA.unknownUpdate || rowA.brokenInstallation) && (rowB.unknownUpdate || rowB.brokenInstallation)) {
                        if (order === 'asc') {
                            if (a > b) {
                                return 1
                            }
                            return -1
                        }
                        if (a > b) {
                            return -1
                        }
                        return 1
                    } else if (rowA.unknownUpdate || rowA.brokenInstallation) {
                        return -1;
                    } else if (rowB.unknownUpdate || rowB.brokenInstallation) {
                        return 1;
                    } else {
                        if (order === 'asc') {
                            if (a > b) {
                                return 1
                            }
                            return -1
                        }
                        if (a > b) {
                            return -1
                        }
                    }
                }
            },
            formatExtraData: {
                currentlyUpdating: this.state.currentlyUpdating,
                erroredUpdates: this.state.erroredUpdates,
                pendingUpdates: this.state.pendingUpdates,
                addonVersion: this.state.addonVersion
            },
                formatter: (cellContent, row, rowIndex, extraData) => {
                let possibleFiles = row.latestFiles.filter((file) => {
                    return (file.releaseType <= row.trackBranch && file.gameVersionFlavor == extraData.addonVersion);
                });
                if (possibleFiles && possibleFiles.length > 0) {
                    var latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                } else {
                    var latest = row.installedFile;
                }

                if (row.ignoreUpdate) {
                    return <div><div><span className="label label-danger">Ignored</span></div></div>;
                } else if (extraData.erroredUpdates.includes(row.addonId)) {
                    return <div><div><span className="label label-danger">ERROR...</span></div></div>;
                } else if (extraData.pendingUpdates.includes(row.addonId)) {
                    return <div><div><span className="label label-danger">Pending...</span></div></div>;
                } else if (extraData.currentlyUpdating.includes(row.addonId)) {
                    return <div><div><span className="label label-danger">Updating...</span></div></div>;
                } else if (row.unknownUpdate) {
                    return (<div>
                                <a data-tip data-for="unknownVersionTooltip">
                                    <span className="label label-danger">Unknown Version</span>
                                </a>
                                <ReactTooltip id="unknownVersionTooltip">
                                    <span>We couldn&apos;t recognize the installed version. You can try re-installing from the right-click menu.</span>
                                </ReactTooltip>
                            </div>)
                } else if (row.brokenInstallation) {
                    return (<div>
                                <a data-tip data-for="brokenInstallationTooltip">
                                    <span className="label label-danger">Missing Files</span>
                                </a>
                                <ReactTooltip id="brokenInstallationTooltip">
                                    <span>Your installation is missing files. Try re-installing from the right-click menu.</span>
                                </ReactTooltip>
                            </div>)
                } else if (row.fileDate < latest.fileDate) {
                    return <div><div><UpdateAddonButton handleClick={this.updateAddon} clickData={row} type='Update' /></div></div>
                } else {
                    return <div><div><span className="label label-danger">Up to Date</span></div></div>;
                }
            }
        }, {
            dataField: 'trackBranch',
            text: 'Latest Version',
            sort: true,
            formatExtraData: {
                    addonVersion: this.state.addonVersion
                },
            formatter: (cellContent, row, rowIndex, extraData) => { 
                let possibleFiles = row.latestFiles.filter((file) => {
                    return (file.releaseType <= row.trackBranch && file.gameVersionFlavor == extraData.addonVersion);
                });
                if (possibleFiles && possibleFiles.length > 0) {
                    let latest = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                    return <span className="label" >{latest.fileName}</span>
                }
                return <span className="label" >{row.installedFile.fileName}</span>
            }
        }, {
            dataField: 'gameVersion',
            text: 'Game Version',
            sort: true,
            headerStyle: (colum, colIndex) => {
                    return { 'minWidth': '115px'};
                }
        }, {
            dataField: 'author',
            sort: true,
            text: 'Author'
            }]

        const defaultSorted = [{
            dataField: 'updateAvailable', // if dataField is not match to any column you defined, it will be ignored.
            order: 'desc' // desc or asc
        },
        {
            dataField: 'brokenInstallation',
            order: 'desc'
        },
        {
            dataField: 'unknownUpdate',
            order: 'desc'
        }];

        const selectRow = {
            mode: 'radio',
            clickToSelect: true,
            selected: this.state.selectedAddon,
            onSelect: this.handleOnSelect,
            hideSelectColumn: true,
            classes: 'selected-addon-row installed-addons-row'
        }
        if (this.state.filter == '') {
            var filteredAddons = this.state.installedAddons;
        } else {
            var filteredAddons = this.state.installedAddons.filter((addon) => {
                return addon.addonName.toLowerCase().includes(this.state.filter.toLowerCase());
            })
        }
        
        const updateAvailable = this.state.installedAddons.some((e) => { return e.updateAvailable == true })

        return (
            <div className="InstalledAddonsWindow">
                <Row>
                    <Col xs={12} className="installed-addon-window-content">
                        <div>
                                <div className="addons-window">
                                    <Row className="addon-window-menu">
                                        <Col xs={6} sm={7} xl={7} className="button-col">
                                            <GameMenuButton handleClick={this.findAddons} type='Refresh' />
                                            <GameMenuButton handleClick={this.updateAll} type='Update All' disabled={!updateAvailable }/>
                                            <GameMenuButton handleClick={() => this.updateAddon(this.state.installedAddons.find(a => {return (a.addonId == this.state.selectedAddon && a.updateAvailable)}))} type='Update' disabled={!this.state.selectedAddon || ! this.state.installedAddons.find(a => {return (a.addonId == this.state.selectedAddon && a.updateAvailable)})} />
                                            <GameMenuButton handleClick={this.uninstallAddon} type='Delete' disabled={this.state.selectedAddon.length > 0 ? false : true} />
                                            <AddonSyncToggle
                                                appUUID={this.state.appUUID}
                                                profile={this.state.profile}
                                                gameId={this.state.gameId}
                                                gameVersion={this.state.gameVersion}
                                                backupPending={this.state.backupPending}
                                                restorePending={this.state.restorePending}
                                                darkMode={this.state.darkMode} />
                                        </Col>
                                        <Col xs={4} sm={3} xl={3} className="filter-col">
                                            <Form.Group>
                                                <Form.Control
                                                    key={this.state.gameVersio}
                                                    type='text'
                                                    name='searchFilter'
                                                    className='addon-search-field filter-field'
                                                    placeholder='Filter'
                                                    defaultValue={this.state.filter}
                                                    onChange={this.changeFilter}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col xs={{span:2}}>
                                            <Button
                                                className="backup-button"
                                                onClick={this.openBackupDialog}
                                            >Backups</Button>
                                        </Col>
                                    </Row>
                                    {this.state.isRefreshing
                                        ? <LoadingSpinner />
                                        : <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? "addon-table-scrollbar mac" : "addon-table-scrollbar"} >
                                            <Row className="addon-table" id="installed-addon-table">
                                                <AddonContextMenu 
                                                    handleUpdate={this.contextUpdateAddon}
                                                    handleReinstall={this.contextReinstallAddon}
                                                    handleUninstall={this.contextUninstallAddon}
                                                    handleChangeBranch={this.contextChangeTrackBranch}
                                                    handleChangeAutoUpdate={this.contextChangeAutoUpdate}
                                                    handleChangeIgnoreUpdate={this.contextChangeIgnoreUpdate}
                                                    handleOpenDir={this.contextOpenAddonDir}
                                                    installedAddons={this.state.installedAddons}
                                                />
                                                <Col xs={12}>
                                                    <BootstrapTable
                                                        keyField={'addonId'}
                                                        data={filteredAddons}
                                                        columns={columns}
                                                        selectRow={selectRow}
                                                        headerClasses='installed-addons-header'
                                                        rowClasses='installed-addons-row'
                                                        noDataIndication={this.state.installedAddons && this.state.installedAddons.length > 0 ? noTableData : noAddonsInstalled}>
                                                    </BootstrapTable>
                                                </Col>

                                            </Row>
                                        </SimpleBar> 
                                    }                                 
                                </div>
                        </div>
                    </Col>
                </Row>
            </div>
        )
    }
}