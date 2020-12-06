import './GameTile.css';

import * as React from 'react';
import PropTypes from 'prop-types';

function GameTile(props) {
  const {
    gameIconPath,
    gameId,
    gameName,
    gameTilePath,
    onClick,
  } = props;

  return (
    <div
      role="button"
      tabIndex="0"
      id={`game-tile-${gameId}`}
      className="GameTile"
      style={{ backgroundImage: `url(${gameTilePath})` }}
      onClick={onClick}
      onKeyPress={onClick}
    >
      <img className="game-icon" alt="Game Icon" src={gameIconPath} />
      {gameName}
    </div>
  );
}

GameTile.propTypes = {
  gameIconPath: PropTypes.string.isRequired,
  gameId: PropTypes.number.isRequired,
  gameName: PropTypes.string.isRequired,
  gameTilePath: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default GameTile;
