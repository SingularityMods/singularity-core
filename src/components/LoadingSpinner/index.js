import './LoadingSpinner.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';


export default class LoadingSpinner extends React.Component {
    render() {
        return (
            <div className="LoadingSpinner">
                <i className="fas fa-spinner fa-spin"></i>
            </div>
        )
    }
}