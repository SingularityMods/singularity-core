import 'bootstrap/dist/css/bootstrap.css';
import 'simplebar/dist/simplebar.min.css';
import '@fortawesome/fontawesome-free/js/all.js';

import './Themes.css';

import './Fonts.css';
import './App.css';

import 'simplebar/dist/simplebar.min.css';

import { hot } from 'react-hot-loader';
import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
const { ipcRenderer } = require('electron');

import Header from './containers/Header';

import AuthDialog from './components/Dialogs/AuthDialog';
import BackupManagementDialog from './components/Dialogs/BackupManagementDialog';
import BackupRestoreDialog from './components/Dialogs/BackupRestoreDialog';

import BigSidebar from './containers/SideBars/BigSidebar';
import SmallSidebar from './containers/SideBars/SmallSidebar';
import MinimizedSidebar from './containers/SideBars/MinimizedSidebar';
import MainContent from './containers/MainContent';
import TermsWindow from './components/TermsWindow';
import ProfileMenu from './containers/Menus/ProfileMenu'


class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedGame: '',
            selectedBackup: null,
            backupDialogOpts: null,
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
            lastRestoreComplete: new Date()
        }

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
        this.declineTerms = this.declineTerms.bind(this);
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
        var termsObj = ipcRenderer.sendSync('get-new-terms');
        const appSettings = ipcRenderer.sendSync('get-app-settings');
        const sidebarMinimized = ipcRenderer.sendSync('is-sidebar-minimized');
        let darkMode = appSettings.darkMode;
        var stateTermsObj = {
            newPrivacy: false,
            privacyText: '',
            newTos: false,
            tosText: '',
            darkMode: darkMode,
            minimizeSidebar: sidebarMinimized
        }
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
    darkModeToggleListener(event,darkMode) {
        this.setState({
            darkMode: darkMode
        })
    }

    /*
     * Dialog Controls
     */
    // <<< Settings Start >>>
    openSettings() {
        this.setState({
            settingsOpened: true,
            profileMenuOpened: false
        })
    }

    closeSettings() {
        this.setState({
            settingsOpened: false
        })
    }
    // <<< Settings End >>>

    // <<< Profile Menu Start >>>
    openProfileMenu() {
        this.setState({
            profileMenuOpened: !this.state.profileMenuOpened
        })
    }

    closeProfileMenu() {
        this.setState({
            profileMenuOpened: false
        })
    }
    // <<< Profile Menu End >>>

    // <<< Auth Dialog Start >>>
    openAuth(authTab) {
        this.setState({
            settingsOpened: false,
            authOpened: authTab,
            profileMenuOpened: false
        })
    }

    closeAuth() {
        this.setState({
            authOpened: null
        });
    }
    // <<< Auth Dialog End >>>

    // <<< Backup Management Dialog Start >>>
    openBackupManagementDialog(opts) {
        this.setState({
            backupManagementOpts: opts
        })
    }

    closeBackupManagementDialog() {
        this.setState({
            backupManagementOpts: null
        })
    }

    submitBackupManagementDialog(cloud) {
        let gameId = this.state.backupManagementOpts.gameId;
        let gameVersion = this.state.backupManagementOpts.gameVersion;
        ipcRenderer.send('create-granular-backup', gameId, gameVersion, cloud);
        this.setState({
            backupPending: true
        })
    }
    granularBackupCompleteListener(event, success, type, gameId, gameVersion ,error) {
        if (success) {
            if (type == 'cloud') {
                this.setState({
                    backupState: null,
                    backupPending: false,
                    latestCloudBackup: new Date()
                })
            } else {
                this.setState({
                    backupState: null,
                    backupPending: false,
                })
            }     
        } else {
            this.setState({
                backupState: null,
                backupPending: false
            })
        } 
    }
    backupStateListener(event, status) {
        this.setState({
            backupState: status
        })
    }
    // << Backup Management Dialog End >>>

    // <<< Backup Restore Dialog Start >>>
    openBackupRestore(backup) {
        console.log(backup);
        this.setState({
            selectedBackup: backup
        })
    }

    closeBackupRestore() {
        this.setState({
            selectedBackup: null
        })
    }

    submitRestoreDialog(backup, restoreSettings) {
        ipcRenderer.send('restore-granular-backup', backup, restoreSettings);
        this.setState({
            restorePending: true
        });
    }

    restoreCompleteListener(event, success, err) {
        this.setState({
            restorePending: false,
            lastRestoreComplete: new Date()})
    }

    restoreStateListener(event, status) {
        this.setState({
            restoreState: status
        })
    }
    // << Backup Restore Dialog End >>>

    /*
     * Additional Controls
     */
    toggleBigSidebar() {
        ipcRenderer.send('toggle-sidebar', !this.state.minimizeSidebar);
        this.setState({
            minimizeSidebar: !this.state.minimizeSidebar
        })
    }

    selectGame(gameId) {
        this.setState({
            selectedGame: gameId,
            settingsOpened: false,
            authOpened: null
        });
    }

    deselectAll() {
        this.setState({
            selectedGame: '',
            settingsOpened: false,
            authOpened: null
        });
    }
    
    acceptTerms(termType) {
        ipcRenderer.send('accept-terms', termType);
        if (termType == 'privacy') {
            this.setState({
                newPrivacy: false,
                privacyText: ''
            })
        } else if (termType = 'tos') {
            this.setState({
                newTos: false,
                tosText: ''
            })
        }
        
    }

    declineTerms() {
        ipcRenderer.send('close-window');
    }

    render() {
        return (
            <Container className="Main-Container Override">
                {this.state.authOpened
                    ? <AuthDialog key={this.state.authOpened} darkMode={this.state.darkMode} toggleTab={this.openAuth} onClose={this.closeAuth} authTab={this.state.authOpened}/>
                    : ''
                }
                {this.state.selectedBackup
                    ? <BackupRestoreDialog 
                        backup={this.state.selectedBackup} 
                        onSubmit={this.submitRestoreDialog}
                        onExit={this.closeBackupRestore}
                        restoreState={this.state.restoreState}
                        backupPending={this.state.backupPending}
                        restorePending={this.state.restorePending}/>
                    : this.state.backupManagementOpts
                        ? <BackupManagementDialog
                            opts={this.state.backupManagementOpts}
                            onSubmit={this.submitBackupManagementDialog}
                            onExit={this.closeBackupManagementDialog}
                            onOpenBackup={this.openBackupRestore}
                            backupState={this.state.backupState}
                            backupPending={this.state.backupPending}
                            restorePending={this.state.restorePending} />
                        : ''
                }
                
                <Header onClick={this.deselectAll} onOpenProfileMenu={this.openProfileMenu }/>
                {this.state.profileMenuOpened
                    ? <ProfileMenu key={this.state.profileMenuOpened} handleClose={this.closeProfileMenu} onOpenAuth={this.openAuth} onOpenSettings={this.openSettings}/>
                    : ''
                }          
                <Row className="fill">
                    {this.state.newPrivacy
                        ? <TermsWindow
                            termType='privacy'
                            text={this.state.privacyText}
                            handleAccept={this.acceptTerms}
                            handleDecline={this.declineTerms}
                        />
                        : this.state.newTos
                            ? <TermsWindow
                                termType='tos'
                                text={this.state.tosText}
                                handleAccept={this.acceptTerms}
                                handleDecline={this.declineTerms}
                            />
                            : ''
                    }
                    <div className="wrapper">
                        <SmallSidebar onClick={this.selectGame} />
                        {this.state.minimizeSidebar
                            ? <MinimizedSidebar onClick={this.selectGame} onToggle={this.toggleBigSidebar}/>
                            : <BigSidebar onClick={this.selectGame} onToggle={this.toggleBigSidebar}/>}
                        <MainContent 
                            openSettings={this.openSettings} 
                            closeSettings={this.closeSettings}
                            openBackupManagementDialog={this.openBackupManagementDialog}
                            openBackupRestore={this.openBackupRestore}
                            selected={this.state.selectedGame} 
                            settingsOpened={this.state.settingsOpened}
                            latestCloudBackup={this.state.latestCloudBackup}
                            lastRestoreComplete={this.state.lastRestoreComplete} />
                    </div>
                </Row>
                </Container>
        )
    }
}

//export default App;
export default hot(module)(App);
