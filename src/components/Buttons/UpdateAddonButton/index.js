import './UpdateAddonButton.css';

import * as React from 'react';
import { Button } from 'react-bootstrap';

export default class UpdateAddonButton extends React.Component {
    constructor(props) {
        super(props);
    }


    render() {
        return (
            this.props.disabled ? (
                <Button className={this.props.className + " UpdateAddonButton disabled"} onClick={() => this.props.handleClick(this.props.clickData)}>{this.props.type}</Button>
            ) : (
                <Button className={this.props.className + " UpdateAddonButton"} onClick={() => this.props.handleClick(this.props.clickData)}>{this.props.type}</Button>
            )
        )  
    }
}