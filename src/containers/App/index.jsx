import 'bootstrap/dist/css/bootstrap.css';
import 'simplebar/dist/simplebar.min.css';
import '@fortawesome/fontawesome-free/js/all';

import '../../Themes.css';

import '../../Fonts.css';
import './App.css';

import { hot } from 'react-hot-loader';
import { Container, Row } from 'react-bootstrap';
import * as React from 'react';

import {
  enableSentry,
  disableSentry,
} from '../../renderer-services/sentry';

import Header from '../Header';
import Footer from '../Footer';

import AuthDialog from '../../components/Dialogs/AuthDialog';
import BackupManagementDialog from '../../components/Dialogs/BackupManagementDialog';
import BackupRestoreDialog from '../../components/Dialogs/BackupRestoreDialog';
import TermsDialog from '../../components/Dialogs/TermsDialog';
import WowExtrasDialog from '../../components/Dialogs/WowExtrasDialog';

import BigSidebar from '../SideBars/BigSidebar';
import SmallSidebar from '../SideBars/SmallSidebar';
import MinimizedSidebar from '../SideBars/MinimizedSidebar';
import MainContent from '../MainContent';
import ProfileMenu from '../Menus/ProfileMenu';
import ClusterDetailsWindow from '../ClusterDetailsWindow';

const { ipcRenderer } = require('electron');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedGame: null,
      selectedBackup: null,
      backupManagementOpts: null,
      settingsOpened: false,
      profileMenuOpened: false,
      authOpened: null,
      wowExtrasOpened: null,
      termsAccepted: false,
      telemetryPrompted: false,
      telemetryEnabled: false,
      darkMode: false,
      backupState: null,
      restoreState: null,
      backupPending: false,
      restorePending: false,
      minimizeSidebar: false,
      latestCloudBackup: new Date(),
      lastRestoreComplete: new Date(),
      games: null,
      selectedAddonId: '',
      selectedCluster: null,
    };

    this.granularBackupCompleteListener = this.granularBackupCompleteListener.bind(this);
    this.telemetryToggleListener = this.telemetryToggleListener.bind(this);
    this.selectGame = this.selectGame.bind(this);
    this.deselectAll = this.deselectAll.bind(this);
    this.openBackupManagementDialog = this.openBackupManagementDialog.bind(this);
    this.closeBackupManagementDialog = this.closeBackupManagementDialog.bind(this);
    this.submitBackupManagementDialog = this.submitBackupManagementDialog.bind(this);
    this.backupStateListener = this.backupStateListener.bind(this);
    this.openBackupRestore = this.openBackupRestore.bind(this);
    this.closeBackupRestore = this.closeBackupRestore.bind(this);
    this.submitRestoreDialog = this.submitRestoreDialog.bind(this);
    this.restoreCompleteListener = this.restoreCompleteListener.bind(this);
    this.restoreStateListener = this.restoreStateListener.bind(this);
    this.openSettings = this.openSettings.bind(this);
    this.closeSettings = this.closeSettings.bind(this);
    this.openAuth = this.openAuth.bind(this);
    this.closeAuth = this.closeAuth.bind(this);
    this.acceptTerms = this.acceptTerms.bind(this);
    this.acceptTelemetry = this.acceptTelemetry.bind(this);
    this.declineTelemetry = this.declineTelemetry.bind(this);
    this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
    this.openProfileMenu = this.openProfileMenu.bind(this);
    this.closeProfileMenu = this.closeProfileMenu.bind(this);
    this.toggleBigSidebar = this.toggleBigSidebar.bind(this);
    this.openClusterListener = this.openClusterListener.bind(this);
    this.closeClusterWindow = this.closeClusterWindow.bind(this);
    this.openWowExtras = this.openWowExtras.bind(this);
    this.closeWowExtras = this.closeWowExtras.bind(this);
    this.clusterAddonInstalledListener = this.clusterAddonInstalledListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('granular-backup-complete', this.granularBackupCompleteListener);
    ipcRenderer.on('granular-restore-complete', this.restoreCompleteListener);
    ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
    ipcRenderer.on('telemetry-toggle', this.telemetryToggleListener);
    ipcRenderer.on('backup-status', this.backupStateListener);
    ipcRenderer.on('restore-status', this.restoreStateListener);
    ipcRenderer.on('open-cluster', this.openClusterListener);
    ipcRenderer.on('cluster-addon-installed', this.clusterAddonInstalledListener);
    ipcRenderer.invoke('get-terms')
      .then((terms) => {
        this.setState({
          termsAccepted: terms.accepted,
        });
      });
    ipcRenderer.invoke('get-telemetry-status')
      .then((telemetry) => {
        if (telemetry.enabled) {
          enableSentry();
        }
        this.setState({
          telemetryPrompted: telemetry.prompted,
          telemetryEnabled: telemetry.enabled,
        });
      });
    ipcRenderer.invoke('get-games')
      .then((games) => {
        this.setState({
          games,
        });
      });
    const appSettings = ipcRenderer.sendSync('get-app-settings');
    const sidebarMinimized = ipcRenderer.sendSync('is-sidebar-minimized');
    const { darkMode } = appSettings;
    const stateTermsObj = {
      darkMode,
      minimizeSidebar: sidebarMinimized,
    };
    this.setState(stateTermsObj);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('granular-backup-complete', this.granularBackupCompleteListener);
    ipcRenderer.removeListener('granular-restore-complete', this.restoreCompleteListener);
    ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
    ipcRenderer.removeListener('telemetry-toggle', this.telemetryToggleListener);
    ipcRenderer.removeListener('backup-status', this.backupStateListener);
    ipcRenderer.removeListener('restore-status', this.restoreStateListener);
    ipcRenderer.removeListener('open-cluster', this.openClusterListener);
    ipcRenderer.removeListener('cluster-addon-installed', this.clusterAddonInstalledListener);
  }

  /*
     * IPC Listeners
     */
  darkModeToggleListener(event, darkMode) {
    this.setState({
      darkMode,
    });
  }

  telemetryToggleListener(event, enabled) {
    const { telemetryEnabled } = this.state;
    if (telemetryEnabled !== enabled) {
      if (enabled) {
        enableSentry();
      } else {
        disableSentry();
      }
      this.setState({
        telemetryEnabled: enabled,
      });
    }
  }

  /*
     * Dialog Controls
     */
  // <<< Settings Start >>>
  openSettings() {
    this.setState({
      settingsOpened: true,
      profileMenuOpened: false,
      selectedCluster: null,
    });
  }

  closeSettings() {
    this.setState({
      settingsOpened: false,
    });
  }
  // <<< Settings End >>>

  // <<< Profile Menu Start >>>
  openProfileMenu() {
    const { profileMenuOpened } = this.state;
    this.setState({
      profileMenuOpened: !profileMenuOpened,
    });
  }

  closeProfileMenu() {
    this.setState({
      profileMenuOpened: false,
    });
  }
  // <<< Profile Menu End >>>

  // <<< Auth Dialog Start >>>
  openAuth(authTab) {
    this.setState({
      settingsOpened: false,
      authOpened: authTab,
      profileMenuOpened: false,
      selectedCluster: null,
    });
  }

  closeAuth() {
    this.setState({
      authOpened: null,
    });
  }
  // <<< Auth Dialog End >>>

  // <<< Wow Extras >>>
  openWowExtras(gameVersion) {
    this.setState({
      wowExtrasOpened: gameVersion,
    });
  }

  closeWowExtras() {
    this.setState({
      wowExtrasOpened: null,
    });
  }

  // <<< Wow Extras End >>>

  // <<< Backup Management Dialog Start >>>
  openBackupManagementDialog(opts) {
    this.setState({
      backupManagementOpts: opts,
    });
  }

  closeBackupManagementDialog() {
    this.setState({
      backupManagementOpts: null,
    });
  }

  submitBackupManagementDialog(cloud) {
    const { backupManagementOpts } = this.state;
    const { gameId } = backupManagementOpts;
    const { gameVersion } = backupManagementOpts;
    ipcRenderer.send('create-granular-backup', gameId, gameVersion, cloud);
    this.setState({
      backupPending: true,
    });
  }

  granularBackupCompleteListener(_event, success, type, eventGameId) {
    const { selectedGame } = this.state;
    if (eventGameId === selectedGame) {
      if (success) {
        if (type === 'cloud') {
          this.setState({
            backupState: null,
            backupPending: false,
            latestCloudBackup: new Date(),
          });
        } else {
          this.setState({
            backupState: null,
            backupPending: false,
          });
        }
      } else {
        this.setState({
          backupState: null,
          backupPending: false,
        });
      }
    }
  }

  backupStateListener(event, status) {
    this.setState({
      backupState: status,
    });
  }
  // << Backup Management Dialog End >>>

  // <<< Backup Restore Dialog Start >>>
  openBackupRestore(backup) {
    this.setState({
      selectedBackup: backup,
    });
  }

  closeBackupRestore() {
    this.setState({
      selectedBackup: null,
    });
  }

  submitRestoreDialog(backup, restoreSettings) {
    ipcRenderer.send('restore-granular-backup', backup, restoreSettings);
    this.setState({
      restorePending: true,
    });
  }

  restoreCompleteListener() {
    this.setState({
      restorePending: false,
      lastRestoreComplete: new Date(),
    });
  }

  restoreStateListener(_event, status) {
    this.setState({
      restoreState: status,
    });
  }
  // << Backup Restore Dialog End >>>

  // <<< Cluster Start >>>
  openClusterListener(_event, cluster) {
    this.setState({
      selectedCluster: cluster,
    });
  }

  clusterAddonInstalledListener(_event, installedAddon) {
    const {
      selectedCluster,
    } = this.state;
    const currentlyInstalledAddons = selectedCluster.installedAddons.map((a) => {
      if (a.addonId !== installedAddon.addonId) {
        return a;
      }
      return installedAddon;
    });
    if (!currentlyInstalledAddons.includes(installedAddon)) {
      currentlyInstalledAddons.splice(0, 0, installedAddon);
    }
    selectedCluster.installedAddons = currentlyInstalledAddons;
    this.setState({
      selectedCluster,
    });
  }

  closeClusterWindow() {
    this.setState({
      selectedCluster: null,
    });
  }

  // << Cluster End >>>

  /*
     * Additional Controls
     */
  toggleBigSidebar() {
    const { minimizeSidebar } = this.state;
    ipcRenderer.send('toggle-sidebar', !minimizeSidebar);
    this.setState({
      minimizeSidebar: !minimizeSidebar,
    });
  }

  selectGame(gameId) {
    this.setState({
      selectedGame: gameId,
      settingsOpened: false,
      authOpened: null,
      selectedCluster: null,
    });
  }

  deselectAll() {
    this.setState({
      selectedGame: null,
      settingsOpened: false,
      authOpened: null,
      selectedCluster: null,
    });
  }

  acceptTerms(termType) {
    if (termType === 'terms') {
      ipcRenderer.send('accept-terms', termType);
      this.setState({
        termsAccepted: true,
      });
    }
  }

  acceptTelemetry() {
    ipcRenderer.send('telemetry-response', true);
    this.setState({
      telemetryPrompted: true,
    });
  }

  declineTelemetry() {
    ipcRenderer.send('telemetry-response', false);
    this.setState({
      telemetryPrompted: true,
    });
  }

  render() {
    function declineTerms() {
      ipcRenderer.send('close-window');
    }
    const {
      authOpened,
      backupManagementOpts,
      backupPending,
      backupState,
      darkMode,
      games,
      latestCloudBackup,
      lastRestoreComplete,
      minimizeSidebar,
      profileMenuOpened,
      restorePending,
      restoreState,
      selectedBackup,
      selectedGame,
      settingsOpened,
      wowExtrasOpened,
      telemetryPrompted,
      termsAccepted,
      selectedAddonId,
      selectedCluster,
    } = this.state;
    return (
      <Container className="Main-Container Override">
        {!termsAccepted
          ? (
            <TermsDialog
              title="The Legal Bit"
              type="terms"
              text={"<p>We built Singularity specifically because privacy is important and how others treat your privacy should matter. By clicking Accept below, you agree to Singularity's <a target='_blank' rel='noreferrer' href='https://singularitymods.com/privacy'>Privacy Policy</a> and <a target='_blank' rel='noreferrer' href='https://singularitymods.com/terms'>Terms of Service</a>. If you have any questions or concerns, please do not hesitate to reach out to us through Twitter or Discord.</p>"}
              handleAccept={this.acceptTerms}
              handleDecline={declineTerms}
            />
          )
          : ''}
        {termsAccepted && !telemetryPrompted
          ? (
            <TermsDialog
              title="Like Working Apps?"
              type="telemetry"
              text={"<p>Help us find bugs before you notice them and before they become a problem. By clicking accept below, you agree to sharing crash reports and performance metrics to help us keep Singularity chugging along. This is absolutely NOT required to use Singularity to it's fullest.</p>"}
              handleAccept={this.acceptTelemetry}
              handleDecline={this.declineTelemetry}
            />
          )
          : ''}
        {(authOpened && !selectedCluster)
          ? (
            <AuthDialog
              key={authOpened}
              darkMode={darkMode}
              toggleTab={this.openAuth}
              onClose={this.closeAuth}
              authTab={authOpened}
            />
          )
          : ''}
        {(selectedBackup && !selectedCluster)
          ? (
            <BackupRestoreDialog
              backup={selectedBackup}
              darkMode={darkMode}
              onSubmit={this.submitRestoreDialog}
              onExit={this.closeBackupRestore}
              restoreState={restoreState}
              backupPending={backupPending}
              restorePending={restorePending}
            />
          )
          : ''}
        {(backupManagementOpts && !selectedBackup && !selectedCluster)
          ? (
            <BackupManagementDialog
              darkMode={darkMode}
              opts={backupManagementOpts}
              onSubmit={this.submitBackupManagementDialog}
              onExit={this.closeBackupManagementDialog}
              onOpenBackup={this.openBackupRestore}
              backupState={backupState}
              backupPending={backupPending}
              restorePending={restorePending}
            />
          )
          : ''}
        {wowExtrasOpened && !selectedCluster
          ? (
            <WowExtrasDialog
              gameVersion={wowExtrasOpened}
              onExit={this.closeWowExtras}
              wagoUpdating={false}
            />
          )
          : ''}
        <Header onClick={this.deselectAll} onOpenProfileMenu={this.openProfileMenu} />
        {(profileMenuOpened)
          ? (
            <ProfileMenu
              darkMode={darkMode}
              key={profileMenuOpened}
              handleClose={this.closeProfileMenu}
              onOpenAuth={this.openAuth}
              onOpenSettings={this.openSettings}
            />
          )
          : ''}
        <Row className="fill">
          <div className="wrapper">
            <SmallSidebar
              darkMode={darkMode}
              onClick={this.selectGame}
              games={games}
            />
            {minimizeSidebar
              ? (
                <MinimizedSidebar
                  darkMode={darkMode}
                  onClick={this.selectGame}
                  onToggle={this.toggleBigSidebar}
                  games={games}
                />
              )
              : (
                <BigSidebar
                  darkMode={darkMode}
                  onClick={this.selectGame}
                  onToggle={this.toggleBigSidebar}
                  games={games}
                />
              )}
            {selectedCluster
              ? (
                <ClusterDetailsWindow
                  cluster={selectedCluster}
                  handleGoBack={this.closeClusterWindow}
                />
              )
              : (
                <MainContent
                  darkMode={darkMode}
                  openSettings={this.openSettings}
                  closeSettings={this.closeSettings}
                  openBackupManagementDialog={this.openBackupManagementDialog}
                  openBackupRestore={this.openBackupRestore}
                  openWowExtras={this.openWowExtras}
                  selected={selectedGame}
                  selectedAddonId={selectedAddonId}
                  settingsOpened={settingsOpened}
                  backupPending={backupPending}
                  restorePending={restorePending}
                  latestCloudBackup={latestCloudBackup}
                  lastRestoreComplete={lastRestoreComplete}
                />
              )}
          </div>
          <Footer />
        </Row>
      </Container>
    );
  }
}

// export default App;
export default hot(module)(App);
