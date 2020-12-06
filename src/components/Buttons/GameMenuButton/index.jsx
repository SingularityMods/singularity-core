import './GameMenuButton.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

function GameWindowButton(props) {
  const {
    className,
    clickData,
    disabled,
    handleClick,
    type,
  } = props;
  return (
    disabled ? (
      <Button className="GameMenuButton disabled" disabled>{type}</Button>
    ) : (
      <Button className={`${className} GameMenuButton`} onClick={() => handleClick(clickData)}>
        {type === 'Back'
          ? <i className="fas fa-undo menu-button-icon" />
          : ''}
        {type}
      </Button>
    )
  );
}

GameWindowButton.propTypes = {
  className: PropTypes.string,
  clickData: PropTypes.node,
  disabled: PropTypes.bool,
  handleClick: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

GameWindowButton.defaultProps = {
  className: '',
  clickData: null,
  disabled: false,
};

export default GameWindowButton;
