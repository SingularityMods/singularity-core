import './SmallSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
import GameSquare from '../../../components/GameSquare';

function SmallSidebar(props) {
  const { onClick, games } = props;
  return (
    <Col xs={2} className="SmallSidebar d-block d-lg-none">
      <div className="sidebar-title">
        Games
      </div>
      {games && games.map((game) => (
        <GameSquare
          key={game.gameId}
          gameId={game.gameId}
          gameName={game.name}
          gameIconPath={game.iconPath}
          gameTilePath={game.tilePath}
          onClick={() => onClick(game.gameId)}
        />
      ))}
    </Col>
  );
}

SmallSidebar.propTypes = {
  games: PropTypes.object,
  onClick: PropTypes.func.isRequired,
};

SmallSidebar.defaultProps = {
  games: {},
};

export default SmallSidebar;
