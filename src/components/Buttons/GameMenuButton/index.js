import './GameMenuButton.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

class GameWindowButton extends React.Component {
    constructor(props) {
        super(props);
    }


    render() {
        return (
            this.props.disabled ? (
                <Button className="GameMenuButton disabled" disabled>{this.props.type}</Button>
            ) : (
                    <Button className={this.props.className + " GameMenuButton"} onClick={() => this.props.handleClick(this.props.clickData)}>
                        {this.props.type == 'Back'
                            ? <i className="fas fa-undo menu-button-icon"></i>
                            : ''}
                        {this.props.type}
                    </Button >
                )
        )
    }
}

GameWindowButton.propTypes = {
    className: PropTypes.string,
    clickData: PropTypes.node,
    disabled: PropTypes.bool,
    handleClick: PropTypes.func,
    type: PropTypes.string
}

export default GameWindowButton;
