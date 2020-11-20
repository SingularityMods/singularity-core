import './BigSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
const { ipcRenderer } = require('electron');

import ReactTooltip from 'react-tooltip';

import GameTile from '../../../components/GameTile';


export default class BigSidebar extends React.Component {
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
        var gameTilePath = ipcRenderer.sendSync('get-game-tile-path', gameId)
        return (
            <Col lg={3} className="BigSidebar d-none d-lg-block">
                <div 
                    data-tip 
                    data-for="bigMenuToggleClose" 
                    className="tray-toggle-icon"
                    onClick={this.props.onToggle}>
                    <i className="fas fa-angle-double-left"></i>
                </div>
                <ReactTooltip id="bigMenuToggleClose">
                    <span>Collapse</span>
                </ReactTooltip>
                <div className="sidebar-title">
                    Games
                </div>
                <GameTile
                    gameId={gameId}
                    gameName={gameName}
                    gameIconPath={gameIconPath}
                    gameTilePath={gameTilePath}
                    onClick={this.handleClick} />
            </Col>
        )
    }
}