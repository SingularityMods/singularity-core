import './MainContent.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';

import HomePage from '../../components/HomePage';
import GameWindow from '../GameWindow';
import SettingsWindow from '../SettingsWindow';

export default class MainContent extends React.Component {
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
                            latestCloudBackup={this.props.latestCloudBackup}
                            lastRestoreComplete={this.props.lastRestoreComplete} />
                        : <HomePage openSettings={this.props.openSettings}/>
                }
            </Col>
        )
    }
}