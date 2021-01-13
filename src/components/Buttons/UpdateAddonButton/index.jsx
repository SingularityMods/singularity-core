import './UpdateAddonButton.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

function UpdateAddonButton(props) {
  const {
    className,
    clickData,
    disabled,
    handleClick,
    type,
  } = props;
  return (
    disabled ? (
      <Button className={`${className} UpdateAddonButton disabled`} onClick={() => handleClick(clickData)}>{type}</Button>
    ) : (
      <Button className={`${className} UpdateAddonButton`} onClick={() => handleClick(clickData)}>{type}</Button>
    )
  );
}

UpdateAddonButton.propTypes = {
  className: PropTypes.string,
  clickData: PropTypes.any,
  disabled: PropTypes.bool,
  handleClick: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

UpdateAddonButton.defaultProps = {
  className: '',
  clickData: null,
  disabled: false,
};

export default UpdateAddonButton;
