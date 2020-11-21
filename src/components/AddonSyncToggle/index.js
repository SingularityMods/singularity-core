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
            syncProfile: null,
            searching: true,
            gettingProfile: false,
            configuring: false,
            profileError: '',
            confirmDialogOpened: true
        }
        this.toggleEnabled = this.toggleEnabled.bind(this);
        this.syncProfileSearchingDoneListener = this.syncProfileSearchingDoneListener.bind(this);
        this.localAddonSyncProfileFoundListener = this.localAddonSyncProfileFoundListener.bind(this);
        this.syncProfileSubmittedListener = this.syncProfileSubmittedListener.bind(this);
        this.onCloseConfirmDialog = this.onCloseConfirmDialog.bind(this);
        this.onConfirmUse = this.onConfirmUse.bind(this);
        this.onConfirmOverwrite = this.onConfirmOverwrite.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('local-sync-profile-found', this.localAddonSyncProfileFoundListener);
        ipcRenderer.on('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.on('sync-profile-submitted', this.syncProfileSubmittedListener)
        let searching = ipcRenderer.sendSync('is-sync-profile-updating');
        let gettingProfile = false
        if (!searching) {
            ipcRenderer.send('get-local-sync-profile', this.state.gameId, this.state.gameVersion);
            var enabled = ipcRenderer.sendSync('is-sync-enabled', this.state.gameId, this.state.gameVersion);
            gettingProfile = true;
        }
        this.setState({
            searching: searching,
            enabled: enabled,
            gettingProfile: gettingProfile
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.profile !== prevProps.profile 
            || this.props.gameId !== prevProps.gameId 
            || this.props.gameVersion !== prevProps.gameVersion
            || this.props.darkMode !== prevProps.darkMode) {
                let searching = ipcRenderer.sendSync('is-sync-profile-updating');
                let gettingProfile = false
                if (!searching) {
                    var enabled = ipcRenderer.sendSync('is-sync-enabled', this.props.gameId, this.props.gameVersion);
                    ipcRenderer.send('get-local-sync-profile', this.props.gameId, this.props.gameVersion);
                    gettingProfile = true;
                }
                this.setState({
                    profile: this.props.profile,
                    gameId: this.props.gameId,
                    enabled: enabled,
                    gameVersion: this.props.gameVersion,
                    darkMode: this.props.darkMode,
                    searching: searching,
                    syncProfile: null,
                    gettingProfile: gettingProfile
                })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
        ipcRenderer.removeListener('local-sync-profile-found', this.localAddonSyncProfileFoundListener);
        ipcRenderer.removeListener('sync-profile-submitted', this.syncProfileSubmittedListener)
    }

    syncProfileSearchingDoneListener(event) {
        ipcRenderer.send('get-local-sync-profile', this.state.gameId, this.state.gameVersion);
        this.setState({
            searching: false,
            gettingProfile: true
        });
    }

    localAddonSyncProfileFoundListener(event, success, gameId, gameVersion, profile, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            if (success){
                if (profile.enabled) {
                    // Check for cloud backups
                }
                this.setState({
                    syncProfile: profile,
                    gettingProfile: false
                })
            } else {
                this.setState({
                    profileError: error,
                    gettingProfile: false
                })
            }
        }
    }

    syncProfileSubmittedListener(event, success, gameId, gameVersion, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {

            //handle error
            this.setState({
                configuring: false
            })
        }
    }

    onCloseConfirmDialog() {
        this.setState({
            confirmDialogOpened: false
        })
    }

    onConfirmUse() {
        console.log('use');
    }

    onConfirmOverwrite() {
        console.log('overwrite');
    }

    toggleEnabled(checked) {
        if (!this.state.enabled) {
            if (this.state.syncProfile.enabled) {
                // Prompt user to accept or overwrite existing profile
                console.log("profile exists");
                this.setState({
                    confirmDialogOpened: true,
                    configuring: true
                })
            } else {
                // Enable profile and upload to cloud
                ipcRenderer.send('create-sync-profile', this.state.gameId, this.state.gameVersion);
                this.setState({
                    configuring: true
                })
            }
        } else {
            ipcRenderer.send('toggle-enable-sync', this.state.gameId, this.state.gameVersion, false)
            this.setState({
                enabled: checked
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
                        exit={this.onCloseConfirmDialog} />
                    : ''
                }
                <a data-tip data-for="addonSyncToggleTooltip">
                <Switch
                    disabled={!this.state.profile || this.state.searching || this.state.gettingProfile || this.state.configuring}
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
                {this.state.searching || this.state.gettingProfile || this.state.configuring
                    ? <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="sync-pending-spinner"  id="sync-pending-spinner">
                            <span className="sr-only">Updating...</span>
                        </Spinner>
                    :''
                }
            </div>
        
        )
    }
}