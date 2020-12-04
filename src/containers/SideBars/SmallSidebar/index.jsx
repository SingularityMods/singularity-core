import './SmallSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
import GameSquare from '../../../components/GameSquare';

const { ipcRenderer } = require('electron');

function SmallSidebar(props) {
  const { onClick } = props;
  const gameId = 1;
  const gameName = ipcRenderer.sendSync('get-game-name', gameId);
  const gameIconPath = ipcRenderer.sendSync('get-game-icon-path', gameId);
  return (
    <Col xs={2} className="SmallSidebar d-block d-lg-none">
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

SmallSidebar.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default SmallSidebar;
