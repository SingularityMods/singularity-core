import './GameTile.css';

import * as React from 'react';

export default class GameTile extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: this.props.gameId,
            name: this.props.gameName,
            iconPath: this.props.gameIconPath,
            tilePath: this.props.gameTilePath
        }
    }
    handleClick = () => {
        this.props.onClick(this.props.gameId);
    }

    render() {
        return (
            <div id={`game-tile-${this.state.id}`} className="GameTile" style={{backgroundImage: `url(${this.state.tilePath})`}} onClick={this.handleClick}>
                <img className='game-icon'  src={this.state.iconPath} />{this.state.name}
            </div>
        )
    }
}