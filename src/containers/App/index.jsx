import 'bootstrap/dist/css/bootstrap.css';
import 'simplebar/dist/simplebar.min.css';
import '@fortawesome/fontawesome-free/js/all';

import '../../Themes.css';

import '../../Fonts.css';
import './App.css';

import { hot } from 'react-hot-loader';
import { Container, Row } from 'react-bootstrap';
import * as React from 'react';

import Header from '../Header';

import AuthDialog from '../../components/Dialogs/AuthDialog';
import BackupManagementDialog from '../../components/Dialogs/BackupManagementDialog';
import BackupRestoreDialog from '../../components/Dialogs/BackupRestoreDialog';

import BigSidebar from '../SideBars/BigSidebar';
import SmallSidebar from '../SideBars/SmallSidebar';
import MinimizedSidebar from '../SideBars/MinimizedSidebar';
import MainContent from '../MainContent';
import TermsWindow from '../../components/TermsWindow';
import ProfileMenu from '../Menus/ProfileMenu';

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
      newPrivacy: false,
      privacyText: '',
      newTos: false,
      tosText: '',
      darkMode: false,
      backupState: null,
      restoreState: null,
      backupPending: false,
      restorePending: false,
      minimizeSidebar: false,
      latestCloudBackup: new Date(),
      lastRestoreComplete: new Date(),
      games: null,
    };

    this.granularBackupCompleteListener = this.granularBackupCompleteListener.bind(this);
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
    this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
    this.openProfileMenu = this.openProfileMenu.bind(this);
    this.closeProfileMenu = this.closeProfileMenu.bind(this);
    this.toggleBigSidebar = this.toggleBigSidebar.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('granular-backup-complete', this.granularBackupCompleteListener);
    ipcRenderer.on('granular-restore-complete', this.restoreCompleteListener);
    ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
    ipcRenderer.on('backup-status', this.backupStateListener);
    ipcRenderer.on('restore-status', this.restoreStateListener);
    ipcRenderer.invoke('get-games')
      .then((games) => {
        this.setState({
          games,
        });
      });
    const termsObj = ipcRenderer.sendSync('get-new-terms');
    const appSettings = ipcRenderer.sendSync('get-app-settings');
    const sidebarMinimized = ipcRenderer.sendSync('is-sidebar-minimized');
    const { darkMode } = appSettings;
    const stateTermsObj = {
      newPrivacy: false,
      privacyText: '',
      newTos: false,
      tosText: '',
      darkMode,
      minimizeSidebar: sidebarMinimized,
    };
    if (termsObj.privacy) {
      stateTermsObj.newPrivacy = true;
      stateTermsObj.privacyText = termsObj.privacyText;
    }
    if (termsObj.tos) {
      stateTermsObj.newTos = true;
      stateTermsObj.tosText = termsObj.tosText;
    }
    this.setState(stateTermsObj);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('granular-backup-complete', this.granularBackupCompleteListener);
    ipcRenderer.removeListener('granular-restore-complete', this.restoreCompleteListener);
    ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
    ipcRenderer.removeListener('backup-status', this.backupStateListener);
    ipcRenderer.removeListener('restore-status', this.restoreStateListener);
  }

  /*
     * IPC Listeners
     */
  darkModeToggleListener(event, darkMode) {
    this.setState({
      darkMode,
    });
  }

  /*
     * Dialog Controls
     */
  // <<< Settings Start >>>
  openSettings() {
    this.setState({
      settingsOpened: true,
      profileMenuOpened: false,
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
    });
  }

  closeAuth() {
    this.setState({
      authOpened: null,
    });
  }
  // <<< Auth Dialog End >>>

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

  granularBackupCompleteListener(_event, success, type, eventGameId, eventGameVersion) {
    const { gameId, gameVersion } = this.state;
    if (eventGameId === gameId && eventGameVersion === gameVersion && success) {
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
    });
  }

  deselectAll() {
    this.setState({
      selectedGame: null,
      settingsOpened: false,
      authOpened: null,
    });
  }

  acceptTerms(termType) {
    ipcRenderer.send('accept-terms', termType);
    if (termType === 'privacy') {
      this.setState({
        newPrivacy: false,
        privacyText: '',
      });
    } else if (termType === 'tos') {
      this.setState({
        newTos: false,
        tosText: '',
      });
    }
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
      newPrivacy,
      newTos,
      privacyText,
      profileMenuOpened,
      restorePending,
      restoreState,
      selectedBackup,
      selectedGame,
      settingsOpened,
      tosText,
    } = this.state;
    return (
      <Container className="Main-Container Override">
        {authOpened
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
        {selectedBackup
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
        {backupManagementOpts && !selectedBackup
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

        <Header onClick={this.deselectAll} onOpenProfileMenu={this.openProfileMenu} />
        {profileMenuOpened
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
          {newPrivacy
            ? (
              <TermsWindow
                darkMode={darkMode}
                termType="privacy"
                text={privacyText}
                handleAccept={this.acceptTerms}
                handleDecline={declineTerms}
              />
            )
            : ''}
          {newTos
            ? (
              <TermsWindow
                darkMode={darkMode}
                termType="tos"
                text={tosText}
                handleAccept={this.acceptTerms}
                handleDecline={declineTerms}
              />
            )
            : ''}
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
            <MainContent
              darkMode={darkMode}
              openSettings={this.openSettings}
              closeSettings={this.closeSettings}
              openBackupManagementDialog={this.openBackupManagementDialog}
              openBackupRestore={this.openBackupRestore}
              selected={selectedGame}
              settingsOpened={settingsOpened}
              backupPending={backupPending}
              restorePending={restorePending}
              latestCloudBackup={latestCloudBackup}
              lastRestoreComplete={lastRestoreComplete}
            />
          </div>
        </Row>
      </Container>
    );
  }
}

// export default App;
export default hot(module)(App);
