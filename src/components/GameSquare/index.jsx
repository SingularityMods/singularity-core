import './GameSquare.css';

import * as React from 'react';
import PropTypes from 'prop-types';

function GameSquare(props) {
  const {
    gameIconPath,
    gameId,
    onClick,
  } = props;
  return (
    <div role="button" tabIndex="0" className="GameSquare" onClick={() => onClick(gameId)} onKeyPress={() => onClick(gameId)}>
      <img className="game-icon" alt="Game icon" src={gameIconPath} />
    </div>
  );
}

GameSquare.propTypes = {
  gameIconPath: PropTypes.string.isRequired,
  gameId: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default GameSquare;
