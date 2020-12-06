import './BigSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import ReactTooltip from 'react-tooltip';

import GameTile from '../../../components/GameTile';

const { ipcRenderer } = require('electron');

function BigSidebar(props) {
  const { onClick, onToggle } = props;
  const gameId = 1;
  const gameName = ipcRenderer.sendSync('get-game-name', gameId);
  const gameIconPath = ipcRenderer.sendSync('get-game-icon-path', gameId);
  const gameTilePath = ipcRenderer.sendSync('get-game-tile-path', gameId);
  return (
    <Col lg={3} className="BigSidebar d-none d-lg-block">
      <div
        data-tip
        data-for="bigMenuToggleClose"
        className="tray-toggle-icon"
        role="button"
        tabIndex="0"
        onClick={onToggle}
        onKeyPress={onToggle}
      >
        <i className="fas fa-angle-double-left" />
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
        onClick={() => onClick(gameId)}
      />
    </Col>
  );
}

BigSidebar.propTypes = {
  onClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default BigSidebar;
