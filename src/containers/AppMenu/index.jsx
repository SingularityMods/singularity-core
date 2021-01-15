import './AppMenu.css';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';

const { ipcRenderer } = require('electron');

class AppMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      maximized: false,
    };
    this.handleMaxUnMax = this.handleMaxUnMax.bind(this);
  }

  componentDidMount() {
    const maximized = ipcRenderer.sendSync('is-maximized-window');
    this.setState({
      maximized,
    });
  }

  handleMaxUnMax() {
    const maximized = ipcRenderer.sendSync('max-un-max-window');
    this.setState({
      maximized,
    });
  }

  render() {
    function handleMinimize() {
      ipcRenderer.send('minimize-window');
    }

    function handleClose() {
      ipcRenderer.send('close-window');
    }
    const { maximized } = this.state;
    return (
      <Row className="AppMenu">
        <Col xs={12} className="header-menu-col">
          <div className="frame-menu pull-right">
            <button type="button" className="menubar-btn" id="minimize-btn" onClick={handleMinimize} aria-label="minimize"><i className="fas fa-window-minimize menu-icon" /></button>
            <button type="button" key={maximized} className="menubar-btn" id="max-unmax-btn" onClick={this.handleMaxUnMax} aria-label="maxunmax"><i className={maximized ? 'far fa-clone menu-icon' : 'far fa-square menu-icon'} /></button>
            <button type="button" className="menubar-btn" id="close-btn" onClick={handleClose} aria-label="close"><i className="fas fa-times menu-icon" /></button>
          </div>
        </Col>
      </Row>
    );
  }
}

export default AppMenu;
