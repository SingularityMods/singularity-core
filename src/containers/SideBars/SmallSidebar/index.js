import './SmallSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
const { ipcRenderer } = require('electron');
import GameSquare from '../../../components/GameSquare';

class SmallSidebar extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(gameId) {
        this.props.onClick(gameId);
    }

    render() {
        var gameId = 1
        var gameName = ipcRenderer.sendSync('get-game-name', gameId)
        var gameIconPath = ipcRenderer.sendSync('get-game-icon-path', gameId)
        return (
            <Col xs={2} className="SmallSidebar d-block d-lg-none">
                <div className="sidebar-title">
                    Games
                </div>
                <GameSquare
                    gameId={gameId}
                    gameName={gameName}
                    gameIconPath={gameIconPath}
                    onClick={this.handleClick} />
            </Col>
        )
    }
}

SmallSidebar.propTypes = {
    onClick: PropTypes.func
}

export default SmallSidebar;
