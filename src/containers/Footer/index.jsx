import './Footer.css';

import * as React from 'react';
import { ipcRenderer } from 'electron';
import { CSSTransition } from 'react-transition-group';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showMessage: false,
      message: null,
      messageType: 'info',
      updateAvailable: false,
    };
    this.messageExited = this.messageExited.bind(this);
    this.footerMessageListener = this.footerMessageListener.bind(this);
    this.updatePendingListener = this.updatePendingListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('update-pending', this.updatePendingListener);
    ipcRenderer.on('app-status-message', this.footerMessageListener);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('update-pending', this.updatePendingListener);
    ipcRenderer.removeListener('app-status-message', this.footerMessageListener);
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
  }

  updatePendingListener() {
    this.setState({
      updateAvailable: true,
    });
  }

  footerMessageListener(event, message, messageType) {
    this.setState({
      message,
      messageType,
      showMessage: true,
    });
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    if (messageType === 'success' || messageType === 'error') {
      this.messageTimeout = setTimeout(() => {
        this.setState({
          showMessage: false,
        });
      }, 2000);
    }
  }

  messageExited() {
    this.setState({
      message: null,
      messageType: 'info',
    });
  }

  render() {
    const {
      message, messageType, showMessage, updateAvailable,
    } = this.state;
    function handleClickUpdate() {
      ipcRenderer.send('install-pending-update');
    }
    return (
      <div id="Footer">
        <CSSTransition
          in={showMessage}
          appear
          exit
          timeout={1000}
          classNames="transition"
          unmountOnExit
          onExited={this.messageExited}
        >
          <div id="footer-message" className={messageType}>
            {message || ''}
            {messageType === 'status'
              ? (
                <span className="footer-status-spinner">
                  <i className="fas fa-spinner fa-spin" />
                </span>
              )
              : ''}
          </div>
        </CSSTransition>
        {updateAvailable && !message
          ? (
            <CSSTransition
              in={updateAvailable && !message}
              appear
              exit
              timeout={1000}
              classNames="transition"
            >
              <div id="footer-message" className={messageType}>
                Singularity app update available -
                {' '}
                <span
                  role="button"
                  tabIndex="0"
                  className="update-available-message"
                  onClick={handleClickUpdate}
                  onKeyPress={handleClickUpdate}
                >
                  Restart And Update
                </span>
              </div>
            </CSSTransition>
          )
          : ''}
      </div>
    );
  }
}

export default Footer;
