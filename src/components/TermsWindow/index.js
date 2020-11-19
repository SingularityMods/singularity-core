import './TermsWindow.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
import SimpleBar from 'simplebar-react';

const scrollableNodeRef = React.createRef();

export default class TermsWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            termType: this.props.termType,
            text: this.props.text
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.termType != prevProps.termType) {
            this.setState({
                termType: this.props.termType,
                text: this.props.text
            })
            scrollableNodeRef.current.scrollTop = 0;
        }

    }

    handleClick = () => {
        this.props.onClick(this.props.categoryId);
    }

    render() {
        if (this.state.termType == 'privacy') {
            var msg = "We Have a New Privacy Policy";
        } else if (this.state.termType = 'tos') {
            var msg = "We Have a New Terms of Service"
        }
        return (
            <Container className="TermsWindow">
                <div className="terms-window-container">
                    <div className="terms-window-content">
                        <Row className="terms-window-header">
                            <Col xs={12}>
                                <h1>{msg}</h1>
                            </Col>
                        </Row>
                        <SimpleBar scrollableNodeProps={{ ref: scrollableNodeRef }} scrollbarMaxSize={50} className="terms-window-scrollbar" >
                            <Row  className="terms-window-body">
                            <div
                                className="terms-body-text"    
                                dangerouslySetInnerHTML={{ __html: this.state.text }}>
                            </div>
                            </Row>
                        </SimpleBar>

                        <Row className="terms-window-contorl">
                            <Col xs={12}>
                                <button id="accept-terms-button" className="terms-button" onClick={() => this.props.handleAccept(this.state.termType)}>Accept</button>
                                <button className="terms-button" onClick={this.props.handleDecline}>Cancel</button>
                            </Col>
                        </Row>
                    </div>
                </div>
            </Container>
        )
    }
}