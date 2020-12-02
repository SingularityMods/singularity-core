import './MinimizedSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
const { ipcRenderer } = require('electron');
import ReactTooltip from 'react-tooltip';

import GameSquare from '../../../components/GameSquare';

class MinimizedSidebar extends React.Component {
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
            <Col xs={2} className="MinimizedSidebar d-none d-lg-block">
                <div 
                    data-tip 
                    data-for="bigMenuToggleClose" 
                    className="tray-toggle-icon minimized"
                    onClick={this.props.onToggle}>
                    <i className="fas fa-angle-double-right"></i>
                </div>
                <ReactTooltip id="bigMenuToggleClose">
                    <span>Expand</span>
                </ReactTooltip>
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

MinimizedSidebar.propTypes = {
    onClick: PropTypes.func,
    onToggle: PropTypes.func
}

export default MinimizedSidebar;