import './AddonScreenshotsTab.css';

import * as React from 'react';
import { Row, Col } from 'react-bootstrap';

export default class AddonScreenshotsTab extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            screenshots: this.props.screenshots,
        }
    }

    render() {
        return (
            <Row>
                <Col xs={12} className="addon-screenshots-pane">
                    {this.state.screenshots && this.state.screenshots.map((screenshot, index, a) => (
                        <img key={screenshot.id} className="addon-screenshot" src={screenshot.url} />
                    ))}
                </Col>
            </Row>
        )
    }
}