import './CategoryButton.css';

import * as React from 'react';
import PropTypes from 'prop-types';

class CategoryButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            categoryId: this.props.categoryId,
            name: this.props.categoryName,
            iconPath: this.props.categoryIcon
        }
    }
    handleClick() {
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

CategoryButton.propTypes = {
    categoryIcon: PropTypes.string,
    categoryId: PropTypes.number,
    categoryName: PropTypes.string,
    onClick: PropTypes.func
}

export default CategoryButton;
