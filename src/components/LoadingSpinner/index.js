import './LoadingSpinner.css';

import * as React from 'react';

class LoadingSpinner extends React.Component {
    render() {
        return (
            <div className="LoadingSpinner">
                <i className="fas fa-spinner fa-spin"></i>
            </div>
        )
    }
}

export default LoadingSpinner