import './MinimizedSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';

import GameSquare from '../../../components/GameSquare';

function MinimizedSidebar(props) {
  const { onClick, onToggle, games } = props;
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

MinimizedSidebar.propTypes = {
  games: PropTypes.object,
  onClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

MinimizedSidebar.defaultProps = {
  games: {},
};

export default MinimizedSidebar;
