import './MainContent.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import HomePage from '../../components/HomePage';
import GameWindow from '../GameWindow';
import SettingsWindow from '../SettingsWindow';

class MainContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedGameId: this.props.selected,
            settingsOpened: this.props.settingsOpened,
            authOpened: this.props.authOpened
        }
    }

   

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if (this.props.selected !== prevProps.selected || this.props.settingsOpened !== prevProps.settingsOpened || this.props.authOpened !== prevProps.authOpened) {
            this.setState({
                selectedGameId: this.props.selected,
                settingsOpened: this.props.settingsOpened,
                authOpened: this.props.authOpened
            })
        }
    }

    render() {
        return (
            <Col md={11} lg={9} className="Main-Content no-float">
                {this.state.settingsOpened
                    ? <SettingsWindow onClose={this.props.closeSettings} />
                    : this.state.selectedGameId
                        ? <GameWindow
                            gameId={this.state.selectedGameId} 
                            openBackupManagementDialog={this.props.openBackupManagementDialog}
                            openBackupRestore={this.props.openBackupRestore}
                            backupPending={this.props.backupPending}
                            restorePending={this.props.restorePending}
                            latestCloudBackup={this.props.latestCloudBackup}
                            lastRestoreComplete={this.props.lastRestoreComplete} />
                        : <HomePage openSettings={this.props.openSettings}/>
                }
            </Col>
        )
    }
}

MainContent.propTypes = {
    authOpened: PropTypes.bool,
    backupPending: PropTypes.bool,
    closeSettings: PropTypes.func,
    latestCloudBackup: PropTypes.object,
    lastRestoreComplete: PropTypes.object,
    openBackupManagementDialog: PropTypes.func,
    openBackupRestore: PropTypes.func,
    openSettings: PropTypes.func,
    restorePending: PropTypes.bool,
    selected: PropTypes.number,
    settingsOpened: PropTypes.bool
}

export default MainContent;
