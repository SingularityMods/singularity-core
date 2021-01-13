import './BigSidebar.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import ReactTooltip from 'react-tooltip';

import GameTile from '../../../components/GameTile';

function BigSidebar(props) {
  const { onClick, onToggle, games } = props;
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
      {games && games.map((game) => (
        <GameTile
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

BigSidebar.propTypes = {
  games: PropTypes.array,
  onClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

BigSidebar.defaultProps = {
  games: {},
};

export default BigSidebar;
