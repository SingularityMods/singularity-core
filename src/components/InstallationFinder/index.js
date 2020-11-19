import './InstallationFinder.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
import { ipcRenderer } from 'electron';

import LoadingSpinner from '../LoadingSpinner';

export default class InstallationFinder extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gameId: this.props.gameId,
            message: '',
            isSearching: false
        }

        this.selectManualFind = this.selectManualFind.bind(this);
        this.selectAutoFind = this.selectAutoFind.bind(this);
        this.installationNotFoundListener = this.installationNotFoundListener.bind(this);
        
    }

    componentDidMount() {
        ipcRenderer.on('installation-not-found', this.installationNotFoundListener);
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('installation-not-found', this.installationNotFoundListener);
        clearTimeout(this.timeout);
    }

    selectManualFind = () => {
        ipcRenderer.send('manually-find-game', this.state.gameId);
        this.setState({
            message: ""
        });
    }

    selectAutoFind = () => {
        ipcRenderer.send('auto-find-game', this.state.gameId);
        this.setState({
            isSearching: true,
            message: "",
        });

        this.timeout = setTimeout(() => {
            this.setState({
                message: "We couldn't locate the game, try finding the installation folder manually.",
                isSearching: false
            });
        }, 10000);
    }


    installationNotFoundListener(event, msg) {
        this.setState({
            message: msg,
            isSearching: false
        });
    }

    render() {
        return (
            <div className="InstallationFinder">
                <Row>
                    <Col xs={12} className="installation-finder-header">
                        <h2>hmmmmm... We couldn't find this game</h2>
                        <p className="installation-finder-error">{this.state.message}</p>
                    </Col>
                </Row>
                <Row>
                    <Col className="installation-finder-container">
                        <button className="find-game-button" onClick={this.selectAutoFind}>Scan For Game</button>
                        <button className="find-game-button" onClick={this.selectManualFind}>Find Game Manually</button>
                    </Col>
                </Row>
                {this.state.isSearching
                    ? <LoadingSpinner />
                    :''
                }
            </div>
        )
    }
}