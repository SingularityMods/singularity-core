import './AddonContextMenu.css';

import { Container, Row, Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

class AddonContextMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      x: 0,
      y: 0,
      imgSrc: '',
      title: '',
      fileName: '',
      installState: '',
      addonId: '',
      addonUrl: '',
      modules: [],
      trackBranch: 1,
      autoUpdate: false,
      ignoreUpdate: false,
      hoverBranchOption: false,
      hoverBranchMenu: false,
      hoverDirOption: false,
      hoverDirMenu: false,
      hoverSettingsOption: false,
      hoverSettingsMenu: false,
    };

    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.onHoverBranchMenu = this.onHoverBranchMenu.bind(this);
    this.onHoverBranchOption = this.onHoverBranchOption.bind(this);
    this.onHoverDirMenu = this.onHoverDirMenu.bind(this);
    this.onHoverDirOption = this.onHoverDirOption.bind(this);
    this.closeBranchMenu = this.closeBranchMenu.bind(this);
    this.closeBranchOption = this.closeBranchOption.bind(this);
    this.closeSettingsMenu = this.closeSettingsMenu.bind(this);
    this.closeSettingsOption = this.closeSettingsOption.bind(this);
    this.closeDirMenu = this.closeDirMenu.bind(this);
    this.closeDirOption = this.closeDirOption.bind(this);
    this.getDirectoryOptions = this.getDirectoryOptions.bind(this);
  }

  componentDidMount() {
    document.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('click', this.handleClick);
  }

  componentWillUnmount() {
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('click', this.handleClick);
    if (this.hoverBranchOptTimeout) {
      clearTimeout(this.hoverBranchOptTimeout);
      this.hoverBranchOptTimeout = 0;
    }
    if (this.hoverBranchMenuTimeout) {
      clearTimeout(this.hoverBranchMenuTimeout);
      this.hoverBranchMenuTimeout = 0;
    }
    if (this.hoverDirOptTimeout) {
      clearTimeout(this.hoverDirOptTimeout);
      this.hoverDirOptTimeout = 0;
    }
    if (this.hoverDirMenuTimeout) {
      clearTimeout(this.hoverDirMenuTimeout);
      this.hoverDirMenuTimeout = 0;
    }
    if (this.hoverSettingsOptTimeout) {
      clearTimeout(this.hoverSettingsOptTimeout);
      this.hoverSettingsOptTimeout = 0;
    }
    if (this.hoverSettingsMenuTimeout) {
      clearTimeout(this.hoverSettingsMenuTimeout);
      this.hoverSettingsMenuTimeout = 0;
    }
  }

  handleClick(event) {
    const { visible } = this.state;
    if (visible) {
      //event.preventDefault();
    }
    this.setState({ visible: false, x: 0, y: 0 });
  }

  handleContextMenu(event) {
    const [
      firstElem, secondElem, thirdElem, fourthElem, fifthElem,
    ] = event.path;
    event.preventDefault();
    if (event.path.some((e) => e.classList && e.classList.contains('installed-addons-row'))) {
      let row = secondElem;
      if (row.tagName === 'TD') {
        row = thirdElem;
      } else if (row.tagName === 'DIV' || row.tagName === 'A') {
        if (firstElem.tagName === 'A' || firstElem.tagName === 'IMG') {
          row = fourthElem;
        } else {
          row = fifthElem;
        }
      }
      const tableCells = row.children;

      const { installedAddons } = this.props;

      const imgSrc = tableCells.item(0).getElementsByClassName('browse-addon-table-img')[0].src;
      const title = tableCells.item(0).getElementsByClassName('browse-addon-name')[0].innerText;
      const installedAddon = installedAddons.find((addon) => addon.addonName === title);
      const trackBranch = installedAddon.trackBranch || 1;
      const autoUpdate = installedAddon.autoUpdate || false;
      const ignoreUpdate = installedAddon.ignoreUpdate || false;
      const { addonId, addonUrl, modules } = installedAddon;
      const fileName = tableCells.item(2).innerText;
      const installState = tableCells.item(1).firstChild.innerText;

      let clickX = event.pageX - 230;
      let clickY = event.layerY;

      if ((window.innerHeight - event.pageY) < 200) {
        clickY -= 120;
      }

      if (clickX + 800 > window.innerWidth) {
        clickX = 250;
      }
      if (clickX < 40) {
        clickX = 40;
      }
      this.setState({
        visible: true,
        x: clickX,
        y: clickY,
        imgSrc,
        title,
        fileName,
        installState,
        addonId,
        addonUrl,
        modules,
        trackBranch,
        autoUpdate,
        ignoreUpdate,
        hoverBranchOption: false,
        hoverBranchMenu: false,
        hoverDirOption: false,
        hoverDirMenu: false,
        hoverSettingsOption: false,
        hoverSettingsMenu: false,
      });
    } else {
      this.setState({
        visible: false,
        x: 0,
        y: 0,
        imgSrc: '',
        title: '',
        fileName: '',
        installState: '',
        addonId: '',
        addonUrl: '',
        modules: [],
        trackBranch: 1,
        autoUpdate: false,
        ignoreUpdate: false,
        hoverBranchOption: false,
        hoverBranchMenu: false,
        hoverDirOption: false,
        hoverDirMenu: false,
        hoverSettingsOption: false,
        hoverSettingsMenu: false,
      });
    }
  }

  onHoverBranchOption(toggle) {
    if (toggle) {
      this.setState({ hoverBranchOption: toggle });
    } else {
      this.hoverBranchOptTimeout = setTimeout(() => {
        this.closeBranchOption();
      }, 60);
    }
  }

  onHoverBranchMenu(toggle) {
    if (toggle) {
      this.setState({ hoverBranchMenu: toggle });
    } else {
      this.hoverBranchMenuTimeout = setTimeout(() => {
        this.closeBranchMenu();
      }, 60);
    }
  }

  onHoverSettingsOption(toggle) {
    if (toggle) {
      this.setState({ hoverSettingsOption: toggle });
    } else {
      this.hoverSettingsOptTimeout = setTimeout(() => {
        this.closeSettingsOption();
      }, 60);
    }
  }

  onHoverSettingsMenu(toggle) {
    if (toggle) {
      this.setState({ hoverSettingsMenu: toggle });
    } else {
      this.hoverSettingsMenuTimeout = setTimeout(() => {
        this.closeSettingsMenu();
      }, 60);
    }
  }

  onHoverDirOption(toggle) {
    if (toggle) {
      this.setState({ hoverDirOption: toggle });
    } else {
      this.hoverDirOptTimeout = setTimeout(() => {
        this.closeDirOption();
      }, 60);
    }
  }

  onHoverDirMenu(toggle) {
    if (toggle) {
      this.setState({ hoverDirMenu: toggle });
    } else {
      this.hoverDirMenuTimeout = setTimeout(() => {
        this.closeDirMenu();
      }, 60);
    }
  }

  getDirectoryOptions() {
    const {
      modules,
    } = this.state;
    const {
      handleOpenDir,
    } = this.props;
    if (modules && modules.length === 1) {
      return (
        <Col xs={12} onClick={() => handleOpenDir(modules[0].folderName)}>
          <div><i className="fas fa-folder context-menu-item-icon" /></div>
          <div className="context-menu-item-lable">Browse Folder</div>
        </Col>
      );
    } if (modules && modules.length > 1) {
      return (
        <Col
          xs={12}
          onMouseEnter={() => this.onHoverDirMenu(true)}
          onMouseLeave={() => this.onHoverDirMenu(false)}
        >
          <div><i className="fas fa-folder context-menu-item-icon" /></div>
          <div className="context-menu-item-lable">Browse Folders</div>
          <div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
        </Col>
      );
    }
    return '';
  }

  closeBranchOption() {
    this.setState({ hoverBranchOption: false });
  }

  closeBranchMenu() {
    this.setState({ hoverBranchMenu: false });
  }

  closeSettingsOption() {
    this.setState({ hoverSettingsOption: false });
  }

  closeSettingsMenu() {
    this.setState({ hoverSettingsMenu: false });
  }

  closeDirOption() {
    this.setState({ hoverDirOption: false });
  }

  closeDirMenu() {
    this.setState({ hoverDirMenu: false });
  }

  render() {
    const {
      addonId,
      addonUrl,
      autoUpdate,
      fileName,
      hoverBranchMenu,
      hoverBranchOption,
      hoverDirMenu,
      hoverDirOption,
      hoverSettingsMenu,
      hoverSettingsOption,
      ignoreUpdate,
      imgSrc,
      installState,
      modules,
      title,
      trackBranch,
      visible,
      x,
      y,
    } = this.state;
    const {
      handleChangeAutoUpdate,
      handleChangeBranch,
      handleChangeIgnoreUpdate,
      handleOpenDir,
      handleReinstall,
      handleUninstall,
      handleUpdate,
    } = this.props;
    const style = {
      position: 'absolute',
      top: `${y}px`,
      left: `${x}px`,
    };
    function getInstallOption() {
      if (installState === 'Updating...') {
        return (
          <Col xs={12} className="context-install-state disabled">
            <div><i className="fas fa-save context-menu-item-icon" /></div>
            <div className="context-menu-item-lable">Currently Updating...</div>
          </Col>
        );
      } if (installState === 'Up to Date'
        || installState.includes('Missing Files')
        || installState.includes('Unknown Version')
      ) {
        return (
          <Col xs={12} className="context-install-state" onClick={() => handleReinstall(title)}>
            <div><i className="fas fa-save context-menu-item-icon" /></div>
            <div className="context-menu-item-lable">Reinstall</div>
          </Col>
        );
      }
      return (
        <Col xs={12} className="context-install-state" onClick={() => handleUpdate(title)}>
          <div><i className="fas fa-save context-menu-item-icon" /></div>
          <div className="context-menu-item-lable">Update</div>
        </Col>
      );
    }
    return (
      <div id="cmenu">
        {visible
          ? (
            <Container className="AddonContextMenu" style={style}>
              <Row className="context-menu-header">
                <Col xs={12}>
                  <img className="context-menu-header-img" alt="Menu header" src={imgSrc} />
                  <h2 className="context-menu-header-title">{title}</h2>
                  <h3 className="context-menu-header-file">{fileName}</h3>
                </Col>
                {hoverDirMenu || hoverDirOption
                  ? (
                    <div
                      className="context-menu-branch-menu directory-menu"
                      onMouseEnter={() => this.onHoverDirOption(true)}
                      onMouseLeave={() => this.onHoverDirOption(false)}
                    >
                      <Row className="context-menu-header sub-header">
                        <Col xs={12}>
                          <h2 className="context-menu-sub-header-title">Browse Folders</h2>
                        </Col>
                      </Row>
                      <Row className="context-menu-body">
                        {modules && modules.map((module) => (
                          <Col xs={12} key={module.folderName} className="context-menu-item sub-menu-item" onClick={() => handleOpenDir(module.folderName)}>
                            <i className="fas fa-folder context-menu-item-icon" />
                            <div className="context-menu-item-lable">{module.folderName}</div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )
                  : ''}
                {hoverBranchMenu || hoverBranchOption
                  ? (
                    <div
                      className="context-menu-branch-menu"
                      onMouseEnter={() => this.onHoverBranchOption(true)}
                      onMouseLeave={() => this.onHoverBranchOption(false)}
                    >
                      <Row className="context-menu-header sub-header">
                        <Col xs={12}>
                          <h2 className="context-menu-sub-header-title">Release Branches</h2>
                        </Col>
                      </Row>
                      <Row className="context-menu-body">
                        <Col
                          xs={12}
                          className="context-menu-item sub-menu-item"
                          onClick={() => handleChangeBranch(addonId, 1)}
                        >
                          {trackBranch === 1
                            ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                            : <div><i className="far fa-circle context-menu-item-icon" /></div>}
                          <div className="context-menu-item-lable">Release</div>
                        </Col>
                        <Col
                          xs={12}
                          className="context-menu-item sub-menu-item"
                          onClick={() => handleChangeBranch(addonId, 2)}
                        >
                          {trackBranch === 2
                            ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                            : <div><i className="far fa-circle context-menu-item-icon" /></div>}
                          <div className="context-menu-item-lable">Beta</div>
                        </Col>
                        <Col
                          xs={12}
                          className="context-menu-item sub-menu-item"
                          onClick={() => handleChangeBranch(addonId, 3)}
                        >
                          {trackBranch === 3
                            ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                            : <div><i className="far fa-circle context-menu-item-icon" /></div>}
                          <div className="context-menu-item-lable">Alpha</div>
                        </Col>
                      </Row>
                    </div>
                  )
                  : ''}
                {hoverSettingsMenu || hoverSettingsOption
                  ? (
                    <div
                      className="context-menu-branch-menu settings-menu"
                      onMouseEnter={() => this.onHoverSettingsOption(true)}
                      onMouseLeave={() => this.onHoverSettingsOption(false)}
                    >
                      <Row className="context-menu-header sub-header">
                        <Col xs={12}>
                          <h2 className="context-menu-sub-header-title">Settings</h2>
                        </Col>
                      </Row>
                      <Row className="context-menu-body">
                        <Col
                          xs={12}
                          className="context-menu-item sub-menu-item"
                          onClick={() => handleChangeAutoUpdate(addonId, !autoUpdate)}
                        >
                          {autoUpdate
                            ? <div><i className="far fa-check-square context-menu-item-icon settings-icon selected" /></div>
                            : <div><i className="far fa-square context-menu-item-icon settings-icon" /></div>}
                          <div className="context-menu-item-lable">Auto Update</div>
                        </Col>
                        <Col
                          xs={12}
                          className="context-menu-item sub-menu-item"
                          onClick={() => handleChangeIgnoreUpdate(addonId, !ignoreUpdate)}
                        >
                          {ignoreUpdate
                            ? <div><i className="far fa-check-square context-menu-item-icon settings-icon selected" /></div>
                            : <div><i className="far fa-square context-menu-item-icon settings-icon" /></div>}
                          <div className="context-menu-item-lable">Ignore Updates</div>
                        </Col>
                      </Row>
                    </div>
                  )
                  : ''}
              </Row>
              {(installState === 'Install')
                ? (
                  <Row className="context-menu-body">
                    <Col xs={12}>
                      <Row className="context-menu-item">
                        <Col xs={12} className="context-install-state">
                          <div><i className="fas fa-save" /></div>
                          <div className="context-menu-item-lable">Install</div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                )
                : (
                  <Row className="context-menu-body">
                    <Col xs={12}>
                    <Row className="context-menu-item">
                        <Col xs={12} className="context-addon-webpage">
                          <a href={addonUrl} target="_blank" rel="noreferrer">
                          <div><i className="fas fa-external-link-alt context-menu-item-icon" /></div>
                          <div className="context-menu-item-lable">Addon Webpage</div>
                          </a>
                        </Col>
                      </Row>
                      <Row className="context-menu-item">
                        {getInstallOption()}
                      </Row>
                      <Row className="context-menu-item">
                        <Col
                          xs={12}
                          className="context-menu-settings"
                          onMouseEnter={() => this.onHoverSettingsMenu(true)}
                          onMouseLeave={() => this.onHoverSettingsMenu(false)}
                        >
                          <div><i className="fas fa-cog context-menu-item-icon" /></div>
                          <div className="context-menu-item-lable">Install Settings</div>
                          <div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
                        </Col>
                      </Row>
                      <Row className="context-menu-item">
                        <Col
                          xs={12}
                          className="context-menu-settings"
                          onMouseEnter={() => this.onHoverBranchMenu(true)}
                          onMouseLeave={() => this.onHoverBranchMenu(false)}
                        >
                          <div><i className="fas fa-wrench context-menu-item-icon" /></div>
                          <div className="context-menu-item-lable">Release Branch</div>
                          <div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
                        </Col>
                      </Row>
                      <Row className="context-menu-item">
                        {this.getDirectoryOptions()}
                      </Row>
                      <Row className="context-menu-item context-uninstall">
                        <Col xs={12} onClick={() => handleUninstall(title)}>
                          <div><i className="fas fa-trash context-menu-item-icon" /></div>
                          <div className="context-menu-item-lable">Delete</div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                )}
            </Container>
          )
          : ''}
      </div>
    );
  }
}

AddonContextMenu.propTypes = {
  handleChangeAutoUpdate: PropTypes.func.isRequired,
  handleChangeBranch: PropTypes.func.isRequired,
  handleChangeIgnoreUpdate: PropTypes.func.isRequired,
  handleOpenDir: PropTypes.func.isRequired,
  handleReinstall: PropTypes.func.isRequired,
  handleUninstall: PropTypes.func.isRequired,
  handleUpdate: PropTypes.func.isRequired,
  installedAddons: PropTypes.array,
};

AddonContextMenu.defaultProps = {
  installedAddons: [],
};

export default AddonContextMenu;
