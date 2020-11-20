import './SocialLinkBar.css';

import * as React from 'react';
import { Row, Col } from 'react-bootstrap';

export default class SocialLinkBar extends React.Component {
    render() {
        return (
            <Row className="SocialLinkBar">
                <Col xs={12}>
                    <a target="_blank" rel="noreferrer" href="https://twitter.com/SingularityAM">
                        <i className="fab fa-twitter-square social-link-icon"></i>
                    </a>
                    <a target="_blank" rel="noreferrer" href="https://reddit.com/r/SingularityMods">
                        <i className="fab fa-reddit-square social-link-icon"></i>
                    </a>
                    <a target="_blank" rel="noreferrer" href="https://facebook.com/SingularityAM">
                        <i className="fab fa-facebook-square social-link-icon"></i>
                    </a>
                    <a target="_blank" rel="noreferrer" href="https://discord.gg/xNcqjUD">
                        <i className="fab fa-discord social-link-icon"></i>
                    </a>
                </Col>
            </Row>
        )
    }
}