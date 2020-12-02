import './AddonScreenshotsTab.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

class AddonScreenshotsTab extends React.Component {
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

AddonScreenshotsTab.propTypes = {
    screenshots: PropTypes.array
}

export default AddonScreenshotsTab;