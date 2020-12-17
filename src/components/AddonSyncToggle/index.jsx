import './AddonSyncToggle.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import Switch from 'react-switch';
import ReactTooltip from 'react-tooltip';
import { Spinner } from 'react-bootstrap';
import { ipcRenderer } from 'electron';

import SyncConfirmDialog from '../Dialogs/SyncConfirmDialog';

class AddonSyncToggle extends React.Component {
  constructor(props) {
    super(props);
    const {
      darkMode,
      profile,
    } = this.props;
    this.state = {
      cloudProfileLastSync: null,
      configuring: false,
      confirmDialogOpened: false,
      darkMode,
      enabled: false,
      error: null,
      profile,
      status: null,
      syncComplete: false,
      syncing: false,
    };
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.enableSyncStatusListener = this.enableSyncStatusListener.bind(this);
    this.syncProfileSearchingDoneListener = this.syncProfileSearchingDoneListener.bind(this);
    this.syncCompleteListener = this.syncCompleteListener.bind(this);
    this.onCloseConfirmDialog = this.onCloseConfirmDialog.bind(this);
    this.onConfirmUse = this.onConfirmUse.bind(this);
    this.onConfirmOverwrite = this.onConfirmOverwrite.bind(this);
  }

  componentDidMount() {
    const {
      backupPending,
      gameId,
      gameVersion,
      restorePending,
    } = this.props;
    ipcRenderer.on('sync-status', this.enableSyncStatusListener);
    ipcRenderer.on('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
    ipcRenderer.on('sync-complete', this.syncCompleteListener);
    const isDarkMode = ipcRenderer.sendSync('is-dark-mode');
    const syncing = ipcRenderer.sendSync('is-sync-profile-updating');
    let enabled = ipcRenderer.sendSync('is-sync-enabled', gameId, gameVersion);
    let status = null;
    if (backupPending) {
      status = 'Backup pending';
    }
    if (restorePending) {
      status = 'Restore pending';
      enabled = false;
    }
    this.setState({
      syncing,
      darkMode: isDarkMode,
      enabled,
      status,
      syncComplete: false,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      enabled,
      status,
      syncComplete,
    } = this.state;
    const {
      backupPending,
      darkMode,
      gameId,
      gameVersion,
      profile,
      restorePending,
    } = this.props;
    let newStatus = status;
    if (backupPending !== prevProps.backupPending) {
      newStatus = backupPending ? 'Backup pending' : null;
      this.setState({
        status: newStatus,
      });
    }
    if (restorePending !== prevProps.restorePending) {
      newStatus = restorePending ? 'Restore pending' : null;
      const newEnabled = restorePending ? false : enabled;
      const newSyncComplete = restorePending ? false : syncComplete;
      this.setState({
        status: newStatus,
        enabled: newEnabled,
        syncComplete: newSyncComplete,
      });
    }
    if (darkMode !== prevProps.darkMode) {
      this.setState({
        darkMode,
      });
    }
    if (profile !== prevProps.profile
          || gameId !== prevProps.gameId
          || gameVersion !== prevProps.gameVersion) {
      const syncing = ipcRenderer.sendSync('is-sync-profile-updating');
      const newEnabled = ipcRenderer.sendSync('is-sync-enabled', gameId, gameVersion);
      this.setState({
        profile,
        enabled: newEnabled,
        syncing,
        syncComplete: false,
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('sync-status', this.enableSyncStatusListener);
    ipcRenderer.removeListener('addon-sync-search-complete', this.syncProfileSearchingDoneListener);
    ipcRenderer.removeListener('sync-complete', this.syncCompleteListener);
  }

  onCloseConfirmDialog() {
    this.setState({
      confirmDialogOpened: false,
      enabled: false,
      configuring: false,
    });
  }

  onConfirmUse() {
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('toggle-addon-sync', gameId, gameVersion, true);
    this.setState({
      confirmDialogOpened: false,
      enabled: true,
      configuring: false,
      status: 'Syncing',
      syncing: true
    })
    ipcRenderer.invoke('sync-from-profile', gameId, gameVersion)
      .then((lastSync) => {
        this.setState({
          syncing: false,
          error: null,
          status: `Last sync: ${lastSync}`,
          syncComplete: true,
        });
        ipcRenderer.send('find-addons-async', gameId, gameVersion);
      })
      .catch(error => {
        this.setState({
          syncing: false,
          error: error.message,
          status: null,
          syncComplete: true,
        });
      })
  }

  onConfirmOverwrite() {
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('create-sync-profile', gameId, gameVersion);
    this.setState({
      confirmDialogOpened: false,
      status: 'Creating new profile',
    });
  }

  syncCompleteListener(event, success, syncedGameId, syncedGameVersion, err) {
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (syncedGameId === gameId && syncedGameVersion === gameVersion) {
      const error = !success ? err : null;
      this.setState({
        syncing: false,
        error,
        status: null,
        syncComplete: true,
      });
    }
  }

  enableSyncStatusListener(event, syncedGameId, syncedGameVersion, status, additionalInfo, error) {
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (syncedGameId === gameId && syncedGameVersion === gameVersion) {
      switch (status) {
        case 'sync-started':
          this.setState({
            syncComplete: false,
            syncing: true,
            status: 'Starting addon sync',
          });
          break;
        case 'handling-addons':
          this.setState({
            syncing: true,
            status: 'Installing/updating from sync profile',
          });
          break;
        case 'deleting-unsynced-addons':
          this.setState({
            syncing: true,
            status: "Uninstalling addons that weren't in sync profile",
          });
          break;
        case 'checking-cloud':
          this.setState({
            status: 'Checking for existing profile',
          });
          break;
        case 'creating-profile':
          this.setState({
            status: 'Creating new profile',
          });
          break;
        case 'profile-found':
          this.setState({
            cloudProfileLastSync: additionalInfo,
            confirmDialogOpened: true,
            status: 'Waiting for overwrite confirmation',
          });
          break;
        case 'sync-complete':
          this.setState({
            configuring: false,
            syncing: false,
            enabled: true,
            status: `Last sync: ${additionalInfo}`,
            syncComplete: true,
          });
          break;
        case 'complete':
          ipcRenderer.send('toggle-addon-sync', gameId, gameVersion, true);
          this.setState({
            configuring: false,
            syncing: false,
            enabled: true,
            status: `Last sync: ${additionalInfo}`,
            syncComplete: true,
          });
          break;
        case 'error':
          this.setState({
            configuring: false,
            syncing: false,
            enabled: false,
            status: null,
            error,
          });
          break;
        default:
          break;
      }
    }
  }

  syncProfileSearchingDoneListener() {
    this.setState({
      syncing: false,
    });
  }

  toggleEnabled() {
    const {
      enabled,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (!enabled) {
      ipcRenderer.send('enable-addon-sync', gameId, gameVersion);
      this.setState({
        configuring: true,
        error: null,
        status: null,
        enabled: true,
      });
    } else {
      ipcRenderer.send('toggle-addon-sync', gameId, gameVersion, false);
      this.setState({
        syncComplete: false,
        error: null,
        status: null,
        enabled: false,
      });
    }
  }

  render() {
    const {
      cloudProfileLastSync,
      configuring,
      confirmDialogOpened,
      darkMode,
      enabled,
      error,
      profile,
      status,
      syncComplete,
      syncing,
    } = this.state;
    const {
      backupPending,
      restorePending,
    } = this.props;
    return (
      <div className="AddonSyncToggle">
        {confirmDialogOpened
          ? (
            <SyncConfirmDialog
              use={this.onConfirmUse}
              overwrite={this.onConfirmOverwrite}
              exit={this.onCloseConfirmDialog}
              cloudProfileLastSync={cloudProfileLastSync}
            />
          )
          : ''}
        <div className="sync-toggle-switch" data-tip data-for="addonSyncToggleTooltip">
          <Switch
            disabled={!profile
                      || !profile.emailVerified
                      || configuring
                      || syncing
                      || backupPending
                      || restorePending}
            onChange={this.toggleEnabled}
            checked={enabled}
            className="settings-switch"
            onColor="#ED8323"
            height={20}
            width={40}
            activeBoxShadow="0 0 2px 3px #ED8323"
          />
        </div>
        <ReactTooltip id="addonSyncToggleTooltip">
          {!profile
            ? <span>You must be logged in to a Singularity account to use this feature.</span>
            : ''}
          {profile && !profile.emailVerified
            ? <span>You need to verify your email before you can use this feature.</span>
            : <span>Sync your addons accross all Singularity installations.</span>}

        </ReactTooltip>
        <div className={!profile || !profile.emailVerified ? 'addon-sync-toggle-label disabled' : 'addon-sync-toggle-label'}>Sync</div>
        {profile && (configuring
          || syncing
          || backupPending
          || restorePending)
          ? (
            <div className="sync-status-icon status-loading">
              <div data-tip data-for="syncStatusIcon" data-tip-disable={!status}>
                <Spinner animation="border" size="sm" key={darkMode} variant={darkMode ? 'light' : 'dark'} role="status" className="sync-pending-spinner" id="sync-pending-spinner">
                  <span className="sr-only">Updating...</span>
                </Spinner>
              </div>
              <ReactTooltip id="syncStatusIcon">
                <span>{status}</span>
              </ReactTooltip>
            </div>
          )
          : ''}

        {profile && error
          ? (
            <div className="sync-status-icon">
              <div data-tip data-for="syncStatusIcon">
                <div><i className="fas fa-exclamation-circle sync-error" /></div>
              </div>
              <ReactTooltip id="syncStatusIcon">
                <span>{error}</span>
              </ReactTooltip>
            </div>
          )
          : ''}
        {profile && syncComplete
          ? (
            <div className="sync-status-icon">
              <div data-tip data-for="syncStatusIcon">
                <div><i className="fas fa-check-circle sync-success" /></div>
              </div>
              <ReactTooltip id="syncStatusIcon">
                <span>{status}</span>
              </ReactTooltip>
            </div>
          )
          : ''}
      </div>

    );
  }
}

AddonSyncToggle.propTypes = {
  backupPending: PropTypes.bool.isRequired,
  darkMode: PropTypes.bool.isRequired,
  gameId: PropTypes.number.isRequired,
  gameVersion: PropTypes.string.isRequired,
  profile: PropTypes.object,
  restorePending: PropTypes.bool.isRequired,
};

AddonSyncToggle.defaultProps = {
  profile: null,
};

export default AddonSyncToggle;
