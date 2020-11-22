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
            searching: true,
            configuring: false,
            profileError: '',
            status: null,
            cloudProfileLastSync: null,
            confirmDialogOpened: false
        }
        this.toggleEnabled = this.toggleEnabled.bind(this);
        this.enableSyncStatusListener = this.enableSyncStatusListener.bind(this);
        this.syncProfileSearchingDoneListener = this.syncProfileSearchingDoneListener.bind(this);
        this.syncProfileSubmittedListener = this.syncProfileSubmittedListener.bind(this);
        this.onCloseConfirmDialog = this.onCloseConfirmDialog.bind(this);
        this.onConfirmUse = this.onConfirmUse.bind(this);
        this.onConfirmOverwrite = this.onConfirmOverwrite.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('enable-sync-status', this.enableSyncStatusListener);
        ipcRenderer.on('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.on('sync-profile-submitted', this.syncProfileSubmittedListener);
        let searching = ipcRenderer.sendSync('is-sync-profile-updating');
        let enabled = ipcRenderer.sendSync('is-sync-enabled', this.state.gameId, this.state.gameVersion);
        this.setState({
            searching: searching,
            enabled: enabled
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
                    searching: searching
                })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('enable-sync-status', this.enableSyncStatusListener);
        ipcRenderer.removeListener('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.removeListener('sync-profile-submitted', this.syncProfileSubmittedListener);
    }

    enableSyncStatusListener(event, gameId, gameVersion, status, additionalInfo, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            if (status == 'profile-found'){
                this.setState({
                    cloudProfileLastSync: additionalInfo,
                    confirmDialogOpened: true
                })
            } else if (status == 'no-profile'){
                this.setState({
                    status: 'Saving profile to cloud'
                })
            } else if (status == 'complete') {
                ipcRenderer.send('toggle-addon-sync', this.state.gameId, this.state.gameVersion, true)
                this.setState({
                    configuring: false,
                    enabled: true,
                    status: null
                })
            }
        }
    }

    syncProfileSearchingDoneListener(event) {
        ipcRenderer.send('get-local-sync-profile', this.state.gameId, this.state.gameVersion);
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
            status: null
        })
    }

    onConfirmOverwrite() {
        ipcRenderer.send('create-sync-profile', this.state.gameId, this.state.gameVersion);
        this.setState({
            confirmDialogOpened: false
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
                {this.state.searching || this.state.configuring
                    ? <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="sync-pending-spinner"  id="sync-pending-spinner">
                            <span className="sr-only">Updating...</span>
                        </Spinner>
                    :''
                }
            </div>
        
        )
    }
}