import './MinimizedSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';

import GameSquare from '../../../components/GameSquare';

const { ipcRenderer } = require('electron');

function MinimizedSidebar(props) {
  const { onClick, onToggle } = props;
  const gameId = 1;
  const gameName = ipcRenderer.sendSync('get-game-name', gameId);
  const gameIconPath = ipcRenderer.sendSync('get-game-icon-path', gameId);
  return (
    <Col xs={2} className="MinimizedSidebar d-none d-lg-block">
      <div
        data-tip
        data-for="bigMenuToggleClose"
        className="tray-toggle-icon minimized"
        role="button"
        tabIndex="0"
        onClick={onToggle}
        onKeyPress={onToggle}
      >
        <i className="fas fa-angle-double-right" />
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
        onClick={onClick}
      />
    </Col>
  );
}

MinimizedSidebar.propTypes = {
  onClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default MinimizedSidebar;
