import './AddonSyncToggle.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import Switch from "react-switch";
import ReactTooltip from 'react-tooltip';
import { Spinner } from 'react-bootstrap';
import { ipcRenderer } from 'electron';

import SyncConfirmDialog from '../Dialogs/SyncConfirmDialog';
import { propTypes } from 'react-bootstrap/esm/Image';


class AddonSyncToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            backupPending: this.props.backupPending,
            cloudProfileLastSync: null,
            configuring: false,
            confirmDialogOpened: false,
            darkMode: this.props.darkMode,
            enabled: false,
            error: null,
            gameId: this.props.gameId,
            gameVersion: this.props.gameVersion,
            profile: this.props.profile,
            restorePending: this.props.restorePending,
            status: null,
            syncComplete: false,
            syncing: false
        }
        this.toggleEnabled = this.toggleEnabled.bind(this);
        this.enableSyncStatusListener = this.enableSyncStatusListener.bind(this);
        this.syncProfileSearchingDoneListener = this.syncProfileSearchingDoneListener.bind(this);
        this.syncCompleteListener = this.syncCompleteListener.bind(this);
        this.onCloseConfirmDialog = this.onCloseConfirmDialog.bind(this);
        this.onConfirmUse = this.onConfirmUse.bind(this);
        this.onConfirmOverwrite = this.onConfirmOverwrite.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('sync-status', this.enableSyncStatusListener);
        ipcRenderer.on('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.on('sync-complete',this.syncCompleteListener);
        let syncing = ipcRenderer.sendSync('is-sync-profile-updating');
        let enabled = ipcRenderer.sendSync('is-sync-enabled', this.state.gameId, this.state.gameVersion);
        let status = null;
        if (this.props.backupPending) {
            status = 'Backup pending';
        }
        if (this.props.restorePending) {
            status = 'Restore pending';
            enabled = false;
        }
        this.setState({
            syncing: syncing,
            enabled: enabled,
            status: status,
            syncComplete: false
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.backupPending !== prevProps.backupPending) {
            let status = this.props.backupPending ? 'Backup pending' : null;
            this.setState({
                backupPending: this.props.backupPending,
                status: status
            });
        }
        if (this.props.restorePending !== prevProps.restorePending) {
            let status = this.props.restorePending ? 'Restore pending' : null;
            let enabled = this.props.restorePending ? false : this.state.enabled;
            let syncComplete = this.props.restorePending ? false : this.state.syncComplete;
            this.setState({
                restorePending: this.props.restorePending,
                status: status,
                enabled: enabled,
                syncComplete: syncComplete
            });
        }
        if (this.props.profile !== prevProps.profile 
            || this.props.gameId !== prevProps.gameId 
            || this.props.gameVersion !== prevProps.gameVersion
            || this.props.darkMode !== prevProps.darkMode) {
                let syncing = ipcRenderer.sendSync('is-sync-profile-updating');
                let enabled = ipcRenderer.sendSync('is-sync-enabled', this.props.gameId, this.props.gameVersion);
                this.setState({
                    profile: this.props.profile,
                    gameId: this.props.gameId,
                    enabled: enabled,
                    gameVersion: this.props.gameVersion,
                    darkMode: this.props.darkMode,
                    syncing: syncing,
                    syncComplete: false
                })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('sync-status', this.enableSyncStatusListener);
        ipcRenderer.removeListener('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.removeListener('sync-complete', this.syncCompleteListener);
    }

    syncCompleteListener(event,success, gameId, gameVersion, err) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            let error = !success ? err : null;
            this.setState({
                syncing: false,
                error: error,
                status: null,
                syncComplete: true
            })
        }
    }

    enableSyncStatusListener(event, gameId, gameVersion, status, additionalInfo, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            switch(status) {
                case 'sync-started':
                    this.setState({
                        syncing: true,
                        status: 'Starting addon sync'
                    })
                    break;
                case 'handling-addons':
                    this.setState({
                        syncing: true,
                        status: 'Installing/updating from sync profile'
                    })
                    break;
                case 'deleting-unsynced-addons':
                    this.setState({
                        syncing: true,
                        status: "Uninstalling addons that weren't in sync profile"
                    })
                    break;
                case 'checking-cloud':
                    this.setState({
                        status: 'Checking for existing profile'
                    });
                    break;
                case 'creating-profile':
                    this.setState({
                        status: 'Creating new profile'
                    });
                    break;
                case 'profile-found':
                    this.setState({
                        cloudProfileLastSync: additionalInfo,
                        confirmDialogOpened: true,
                        status: 'Waiting for overwrite confirmation'
                    });
                    break;
                case 'sync-complete':
                    this.setState({
                        configuring: false,
                        syncing: false,
                        enabled: true,
                        status: 'Last sync: '+additionalInfo,
                        syncComplete: true
                    });
                    break;
                case 'complete':
                    ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, true)
                    this.setState({
                        configuring: false,
                        syncing: false,
                        enabled: true,
                        status: 'Last sync: '+additionalInfo,
                        syncComplete: true
                    });
                    break;
                case 'error':
                    this.setState({
                        configuring: false,
                        syncing: false,
                        enabled: false,
                        status: null,
                        error: error
                    });
                    break;

            }
        }
    }

    syncProfileSearchingDoneListener(event) {
        this.setState({
            syncing: false,
            gettingProfile: true
        });
    }

    onCloseConfirmDialog() {
        this.setState({
            confirmDialogOpened: false,
            enabled: false,
            configuring: false
        })
    }

    onConfirmUse() {
        ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, true);
        ipcRenderer.send('trigger-sync', this.state.gameId, this.state.gameVersion);
        this.setState({
            confirmDialogOpened: false,
            enabled: true,
            configuring: false,
            status: 'Syncing',
            syncing: true
        })
    }

    onConfirmOverwrite() {
        ipcRenderer.send('create-sync-profile', this.state.gameId, this.state.gameVersion);
        this.setState({
            confirmDialogOpened: false,
            status: 'Creating new profile'
        })
    }

    toggleEnabled(checked) {
        if (!this.state.enabled) {
            ipcRenderer.send('enable-addon-sync', this.state.gameId, this.state.gameVersion)
            this.setState({
                configuring: true,
                enabled: true
            })
        } else {
            ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, false)
            this.setState({
                syncComplete: false,
                enabled: false
            });
        }
    }

    render() {
        return (
            <div className="AddonSyncToggle">
                {this.state.confirmDialogOpened
                    ? <SyncConfirmDialog
                        use={this.onConfirmUse}
                        overwrite={this.onConfirmOverwrite}
                        exit={this.onCloseConfirmDialog}
                        cloudProfileLastSync={this.state.cloudProfileLastSync} />
                    : ''
                }
                <a data-tip data-for="addonSyncToggleTooltip">
                <Switch
                    disabled={!this.state.profile 
                                || this.state.configuring 
                                || this.state.syncing
                                || this.state.backupPending
                                || this.state.restorePending}
                    onChange={this.toggleEnabled}
                    checked={this.state.enabled}
                    className="settings-switch"
                    onColor="#ED8323"
                    height={20}
                    width={40}
                    activeBoxShadow="0 0 2px 3px #ED8323" />
                </a>
                <ReactTooltip id="addonSyncToggleTooltip">
                    {!this.state.profile
                        ? <span>You must be logged in to a Singularity account to use this feature.</span>
                        : !this.state.profile.emailVerified
                            ? <span>You need to verify your email before you can use this feature.</span>
                            : <span>Sync your addons accross all Singularity installations.</span>
                    }

                </ReactTooltip>
                <div className={!this.state.profile || !this.state.profile.emailVerified ? "addon-sync-toggle-label disabled" : "addon-sync-toggle-label" }>Sync</div>
                {this.state.configuring 
                    || this.state.syncing
                    || this.state.backupPending
                    || this.state.restorePending
                    ? <div className="sync-status-icon status-loading">
                        <a data-tip data-for="syncStatusIcon" data-tip-disable={!this.state.status}>
                            <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="sync-pending-spinner"  id="sync-pending-spinner">
                                <span className="sr-only">Updating...</span>
                            </Spinner>
                        </a>
                        <ReactTooltip id="syncStatusIcon">
                                <span>{this.state.status}</span>
                        </ReactTooltip>
                    </div>
                    : this.state.error
                        ? <div className="sync-status-icon">
                            <a data-tip data-for="syncStatusIcon">
                                <div><i className="fas fa-exclamation-circle sync-error"></i></div>
                            </a>
                            <ReactTooltip id="syncStatusIcon">
                                <span>{this.state.error}</span>
                            </ReactTooltip>
                        </div>
                        : this.state.syncComplete
                            ? <div className="sync-status-icon">
                                    <a data-tip data-for="syncStatusIcon">
                                        <div><i className="fas fa-check-circle sync-success"></i></div>
                                    </a>
                                    <ReactTooltip id="syncStatusIcon">
                                        <span>{this.state.status}</span>
                                    </ReactTooltip>
                                </div>
                            : ''
                }
            </div>
        
        )
    }
}

AddonSyncToggle.propTypes = {
    backupPending: PropTypes.bool,
    darkMode: PropTypes.bool,
    gameId: PropTypes.number,
    gameVersion: PropTypes.string,
    profile: PropTypes.object,
    restorePending: PropTypes.bool
}

export default AddonSyncToggle;