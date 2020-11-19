import './CategoryButton.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';


export default class CategoryButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            categoryId: this.props.categoryId,
            name: this.props.categoryName,
            iconPath: this.props.categoryIcon
        }
    }
    handleClick = () => {
        this.props.onClick(this.props.categoryId);
    }

    render() {
        return (
            <div className="CategoryButton" onClick={this.handleClick}>
                <img className="category-icon" src={this.state.iconPath} />
                <p className="cateogry-desc">{this.state.name}</p>
            </div>
        )
    }
}