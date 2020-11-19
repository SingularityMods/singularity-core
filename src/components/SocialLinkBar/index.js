import './SocialLinkBar.css';

import * as React from 'react';
import { Button } from 'react-bootstrap';
import { Container, Row, Col } from 'react-bootstrap';

export default class SocialLinkBar extends React.Component {
    constructor(props) {
        super(props);
    }


    render() {
        return (
            <Row className="SocialLinkBar">
                <Col xs={12}>
                    <a target="_blank" href="https://twitter.com/SingularityAM">
                        <i className="fab fa-twitter-square social-link-icon"></i>
                    </a>
                    <a target="_blank" href="https://reddit.com/r/SingularityMods">
                        <i className="fab fa-reddit-square social-link-icon"></i>
                    </a>
                    <a target="_blank" href="https://facebook.com/SingularityAM">
                        <i className="fab fa-facebook-square social-link-icon"></i>
                    </a>
                    <a target="_blank" href="https://discord.gg/xNcqjUD">
                        <i className="fab fa-discord social-link-icon"></i>
                    </a>
                </Col>
            </Row>
        )
    }
}