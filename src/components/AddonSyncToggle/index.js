import './AddonSyncToggle.css';

import * as React from 'react';
import Switch from "react-switch";
import ReactTooltip from 'react-tooltip';
import { Spinner } from 'react-bootstrap';
import { ipcRenderer } from 'electron';

import SyncConfirmDialog from '../Dialogs/SyncConfirmDialog';


export default class AddonSyncToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            enabled: false,
            profile: this.props.profile,
            gameId: this.props.gameId,
            gameVersion: this.props.gameVersion,
            darkMode: this.props.darkMode,
            searching: false,
            syncing: false,
            configuring: false,
            error: null,
            status: null,
            syncComplete: false,
            cloudProfileLastSync: null,
            confirmDialogOpened: false
        }
        this.toggleEnabled = this.toggleEnabled.bind(this);
        this.enableSyncStatusListener = this.enableSyncStatusListener.bind(this);
        this.syncProfileSearchingDoneListener = this.syncProfileSearchingDoneListener.bind(this);
        this.syncProfileSubmittedListener = this.syncProfileSubmittedListener.bind(this);
        this.syncCompleteListener = this.syncCompleteListener.bind(this);
        this.onCloseConfirmDialog = this.onCloseConfirmDialog.bind(this);
        this.onConfirmUse = this.onConfirmUse.bind(this);
        this.onConfirmOverwrite = this.onConfirmOverwrite.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('sync-status', this.enableSyncStatusListener);
        ipcRenderer.on('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.on('sync-profile-submitted', this.syncProfileSubmittedListener);
        ipcRenderer.on('sync-complete',this.syncCompleteListener);
        let searching = ipcRenderer.sendSync('is-sync-profile-updating');
        let enabled = ipcRenderer.sendSync('is-sync-enabled', this.state.gameId, this.state.gameVersion);
        this.setState({
            searching: searching,
            enabled: enabled,
            syncComplete: false
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.profile !== prevProps.profile 
            || this.props.gameId !== prevProps.gameId 
            || this.props.gameVersion !== prevProps.gameVersion
            || this.props.darkMode !== prevProps.darkMode) {
                let searching = ipcRenderer.sendSync('is-sync-profile-updating');
                let enabled = ipcRenderer.sendSync('is-sync-enabled', this.props.gameId, this.props.gameVersion);
                this.setState({
                    profile: this.props.profile,
                    gameId: this.props.gameId,
                    enabled: enabled,
                    gameVersion: this.props.gameVersion,
                    darkMode: this.props.darkMode,
                    searching: searching,
                    syncComplete: false
                })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('enable-sync-status', this.enableSyncStatusListener);
        ipcRenderer.removeListener('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.removeListener('sync-profile-submitted', this.syncProfileSubmittedListener);
        ipcRenderer.removeListener('sync-complete', this.syncCompleteListener);
    }

    syncCompleteListener(event,success, gameId, gameVersion, err) {
        console.log
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
                case 'complete':
                    ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, true)
                    this.setState({
                        configuring: false,
                        enabled: true,
                        status: null,
                        syncComplete: true
                    });
                    break;
                case 'error':
                    this.setState({
                        configuring: false,
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
            searching: false,
            gettingProfile: true
        });
    }

    syncProfileSubmittedListener(event, success, gameId, gameVersion, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            if (success) {
                ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, true)
                this.setState({
                    enabled: true,
                    configuring: false,
                    status: null
                })
            } else {
                this.setState({
                    configuring: false,
                    error: error
                })
            }
        }
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
                    disabled={!this.state.profile || this.state.searching || this.state.configuring}
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
                {this.state.searching || this.state.configuring || this.state.searching
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
                                <i className="fas fa-exclamation-circle sync-error"></i>
                            </a>
                            <ReactTooltip id="syncStatusIcon">
                                <span>{this.state.error}</span>
                            </ReactTooltip>
                        </div>
                        : this.state.syncComplete
                            ? <div className="sync-status-icon">
                                    <a data-tip data-for="syncStatusIcon">
                                        <i className="fas fa-check-circle sync-success"></i>
                                    </a>
                                </div>
                            : ''
                }
            </div>
        
        )
    }
}