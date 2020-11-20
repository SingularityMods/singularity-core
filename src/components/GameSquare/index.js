import './GameSquare.css';

import * as React from 'react';

export default class GameSquare extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: this.props.gameId,
            name: this.props.gameName,
            iconPath: this.props.gameIconPath
        }
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.onClick(this.props.gameId);
    }

    render() {
        return (
            <div className="GameSquare" onClick={this.handleClick}>
                <img className="game-icon" src={this.state.iconPath} />
            </div>
        )
    }
}