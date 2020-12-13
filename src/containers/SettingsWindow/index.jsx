import './SettingsWindow.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Button, DropdownButton, Dropdown,
} from 'react-bootstrap';
import Switch from 'react-switch';
import SimpleBar from 'simplebar-react';
import ReactTooltip from 'react-tooltip';

const { ipcRenderer } = require('electron');

class SettingsWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      appSettings: null,
      wowInstalls: null,
      wowInstallsErr: {},
      gameDefaults: null,
    };
    this.toggleDarkMode = this.toggleDarkMode.bind(this);
    this.toggleBeta = this.toggleBeta.bind(this);
    this.toggleCloseToTray = this.toggleCloseToTray.bind(this);
    this.toggleUpdateInterval = this.toggleUpdateInterval.bind(this);
    this.toggleDefaultWow = this.toggleDefaultWow.bind(this);
    this.toggleDefaultWowAddonTrack = this.toggleDefaultWowAddonTrack.bind(this);
    this.toggleDefaultWowAutoUpdate = this.toggleDefaultWowAutoUpdate.bind(this);
    this.installDirChangeAcceptedListener = this.installDirChangeAcceptedListener.bind(this);
    this.installDirChangeRejectedListener = this.installDirChangeRejectedListener.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('installation-path-updated', this.installDirChangeAcceptedListener);
    ipcRenderer.on('installation-not-found', this.installDirChangeRejectedListener);
    const appSettings = ipcRenderer.sendSync('get-app-settings');
    const gameSettings = ipcRenderer.sendSync('get-game-settings', 1);
    const wowInstalls = {
      wow_retail: gameSettings.wow_retail.installPath,
      wow_classic: gameSettings.wow_classic.installPath,
      wow_retail_ptr: gameSettings.wow_retail_ptr.installPath,
      wow_classic_ptr: gameSettings.wow_classic_ptr.installPath,
      wow_retail_beta: gameSettings.wow_retail_beta.installPath,

    };
    const gameDefaults = {
      wow_retail: gameSettings.wow_retail.defaults,
      wow_classic: gameSettings.wow_classic.defaults,
      wow_retail_ptr: gameSettings.wow_retail_ptr.defaults,
      wow_classic_ptr: gameSettings.wow_classic_ptr.defaults,
      wow_retail_beta: gameSettings.wow_retail_beta.defaults,
    };
    this.setState({
      appSettings,
      wowInstalls,
      gameDefaults,
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('installation-path-updated', this.installDirChangeAcceptedListener);
    ipcRenderer.removeListener('installation-not-found', this.installDirChangeRejectedListener);
  }

  toggleCloseToTray(checked) {
    const { appSettings } = this.state;
    appSettings.closeToTray = checked;
    ipcRenderer.send('set-app-settings', appSettings);
    this.setState({
      appSettings,
    });
  }

  toggleDarkMode(checked) {
    const { appSettings } = this.state;
    appSettings.darkMode = checked;
    ipcRenderer.send('set-app-settings', appSettings);
    this.setState({
      appSettings,
    });
  }

  toggleBeta(checked) {
    const { appSettings } = this.state;
    appSettings.beta = checked;
    ipcRenderer.send('set-app-settings', appSettings);
    this.setState({
      appSettings,
    });
  }

  toggleUpdateInterval(i) {
    const { appSettings } = this.state;
    appSettings.addonUpdateInterval = i;
    ipcRenderer.send('set-app-settings', appSettings);
    this.setState({
      appSettings,
    });
  }

  toggleDefaultWow(i) {
    const { appSettings } = this.state;
    appSettings.defaultWowVersion = i;
    ipcRenderer.send('set-app-settings', appSettings);
    this.setState({
      appSettings,
    });
  }

  toggleDefaultWowAddonTrack(branch, event) {
    const { gameDefaults } = this.state;
    gameDefaults[event.target.attributes.gameversion.value].trackBranch = parseInt(branch, 10);
    ipcRenderer.send('set-game-defaults', 1, event.target.attributes.gameversion.value, gameDefaults[event.target.attributes.gameversion.value]);
    this.setState({
      gameDefaults,
    });
  }

  toggleDefaultWowAutoUpdate(checked, event, id) {
    const { gameDefaults } = this.state;
    switch (id) {
      case 'wow_retail_auto_update':
        gameDefaults.wow_retail.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_retail', gameDefaults.wow_retail);
        break;
      case 'wow_classic_auto_update':
        gameDefaults.wow_classic.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_classic', gameDefaults.wow_classic);
        break;
      case 'wow_retail_ptr_auto_update':
        gameDefaults.wow_retail_ptr.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_retail_ptr', gameDefaults.wow_retail_ptr);
        break;
      case 'wow_classic_ptr_auto_update':
        gameDefaults.wow_classic_ptr.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_classic_ptr', gameDefaults.wow_classic_ptr);
        break;
      case 'wow_retail_beta_auto_update':
        gameDefaults.wow_retail_beta.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_retail_beta', gameDefaults.wow_retail_beta);
        break;
      case 'wow_classic_beta_auto_update':
        gameDefaults.wow_classic_beta.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_classic_beta', gameDefaults.wow_classic_beta);
        break;
      default:
        gameDefaults.wow_retail.autoUpdate = checked;
        ipcRenderer.send('set-game-defaults', 1, 'wow_retail', gameDefaults.wow_retail);
        break;
    }
    this.setState({
      gameDefaults,
    });
  }

  installDirChangeAcceptedListener(event, gameVersion, path) {
    const { wowInstalls } = this.state;
    wowInstalls[gameVersion] = path;
    const { wowInstallsErr } = this.state;
    wowInstallsErr[gameVersion] = false;
    this.setState({
      wowInstalls,
      wowInstallsErr,
    });
  }

  installDirChangeRejectedListener(event, gameVersion) {
    const { wowInstallsErr } = this.state;
    wowInstallsErr[gameVersion] = true;
    this.setState({
      wowInstallsErr,
    });
  }

  render() {
    const {
      appSettings,
      gameDefaults,
      wowInstalls,
      wowInstallsErr,
    } = this.state;
    const {
      onClose,
    } = this.props;
    let updateIntTitle = '1 hour';
    if (appSettings && appSettings.addonUpdateInterval) {
      switch (appSettings.addonUpdateInterval) {
        case '15m':
          updateIntTitle = '15 Minutes';
          break;
        case '30m':
          updateIntTitle = '30 Minutes';
          break;
        case '1h':
          updateIntTitle = '1 Hour';
          break;
        case '3h':
          updateIntTitle = '3 Hours';
          break;
        case 'never':
          updateIntTitle = 'Never';
          break;
        default:
          updateIntTitle = '1 Hour';
      }
    }
    let defaultWowTitle = 'Retail';
    if (appSettings && appSettings.defaultWowVersion) {
      switch (appSettings.defaultWowVersion) {
        case 'wow_retail':
          defaultWowTitle = 'Retail';
          break;
        case 'wow_classic':
          defaultWowTitle = 'Classic';
          break;
        case 'wow_retail_ptr':
          defaultWowTitle = 'Retail PTR';
          break;
        case 'wow_classic_ptr':
          defaultWowTitle = 'Classic PTR';
          break;
        case 'wow_retail_beta':
          defaultWowTitle = 'Retail Beta';
          break;
        default:
          defaultWowTitle = 'Retail';
      }
    }

    function getDefaultTrackTile(track) {
      let trackTitle = '';
      switch (track) {
        case 1:
          trackTitle = 'Release';
          break;
        case 2:
          trackTitle = 'Beta';
          break;
        case 3:
          trackTitle = 'Alpha';
          break;
        default:
          trackTitle = 'release';
      }
      return trackTitle;
    }

    function openLogDir() {
      ipcRenderer.send('open-log-directory');
    }

    function changeWowInstallDir(gameVersion) {
      ipcRenderer.send('update-wow-path', gameVersion);
    }

    return (

      <div className="SettingsWindow">
        {(appSettings && wowInstalls)
          ? (
            <SimpleBar scrollbarMaxSize={50} className="settings-scrollbar">
              <div>
                <Row className="settings-exit">
                  <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                    <Button className="settings-close-button" id="close-settings-btn" onClick={onClose}>Close</Button>
                  </Col>
                </Row>
                <Row>
                  <Col xs={{ span: 10, offset: 1 }} className="settings-window-header">
                    Settings
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className="settings-window-section-header">
                    App Preferences
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className="settings-section">
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Dark Mode</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDarkMode}
                              checked={appSettings.darkMode}
                              className="settings-switch"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Addon Update Check Interval</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="update-interval-dropdown"
                          title={updateIntTitle}
                          onSelect={this.toggleUpdateInterval}
                        >
                          <Dropdown.Item
                            key="15m"
                            eventKey="15m"
                          >
                            15 Minutes
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="30m"
                            eventKey="30m"
                          >
                            30 Minutes
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="1h"
                            eventKey="1h"
                          >
                            1 Hour
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="3h"
                            eventKey="3h"
                          >
                            3 Hours
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="never"
                            eventKey="never"
                          >
                            Never
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    {process.platform === 'win32' || process.platform === 'darwin'
                      ? (
                        <Row className="settings-item">
                          <Col xs={4} md={3} className="settings-item-name">
                            <div>
                              Close To
                              {process.platform === 'darwin' ? ' Dock' : ' System Tray'}
                            </div>
                          </Col>
                          <Col xs={8} md={9} className="settings-item-config">
                            {appSettings
                              ? (
                                <Switch
                                  onChange={this.toggleCloseToTray}
                                  checked={appSettings.closeToTray}
                                  className="settings-switch"
                                  onColor="#ED8323"
                                  height={20}
                                  width={40}
                                  activeBoxShadow="0 0 2px 3px #ED8323"
                                />
                              )
                              : ''}
                          </Col>
                        </Row>
                      )
                      : ''}
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Singularity Beta Opt-In</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleBeta}
                              checked={appSettings.beta}
                              className="settings-switch"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} className="settings-window-section-header">
                    World of Warcraft Settings
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className="settings-section">
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Default WoW Version</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-dropdown"
                          title={defaultWowTitle}
                          onSelect={this.toggleDefaultWow}
                        >
                          <Dropdown.Item
                            key="wow_retail"
                            eventKey="wow_retail"
                          >
                            Retail
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="wow_classic"
                            eventKey="wow_classic"
                          >
                            Classic
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="wow_retail_ptr"
                            eventKey="wow_retail_ptr"
                          >
                            PTR
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="wow_classic_ptr"
                            eventKey="wow_classic_ptr"
                          >
                            Classic PTR
                          </Dropdown.Item>
                          <Dropdown.Item
                            key="wow_retail_beta"
                            eventKey="wow_retail_beta"
                          >
                            Retail Beta
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Retail Install Path</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="retail-dir-location">
                          <Button
                            className="select-install-dir-button"
                            onClick={() => changeWowInstallDir('wow_retail')}
                          >
                            {wowInstalls.wow_retail}
                          </Button>
                        </p>
                        <ReactTooltip id="retail-dir-location">
                          <span>{wowInstalls.wow_retail}</span>
                        </ReactTooltip>
                        {wowInstallsErr && wowInstallsErr.wow_retail
                          ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Retail Default Addon Track</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-retail-track-dropdown"
                          title={getDefaultTrackTile(gameDefaults.wow_retail.trackBranch)}
                          onSelect={this.toggleDefaultWowAddonTrack}
                        >
                          <Dropdown.Item
                            gameversion="wow_retail"
                            key={1}
                            eventKey={1}
                          >
                            Release
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail"
                            key={2}
                            eventKey={2}
                          >
                            Beta
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail"
                            key={3}
                            eventKey={3}
                          >
                            Alpha
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Retail Default Auto Update</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDefaultWowAutoUpdate}
                              checked={gameDefaults.wow_retail.autoUpdate}
                              gameversion="wow_retail"
                              id="wow_retail_auto_update"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic Install Path</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="classic-dir-location">
                          <Button
                            className="select-install-dir-button"
                            onClick={() => changeWowInstallDir('wow_classic')}
                          >
                            {wowInstalls.wow_classic}
                          </Button>
                        </p>
                        <ReactTooltip id="classic-dir-location">
                          <span>{wowInstalls.wow_classic}</span>
                        </ReactTooltip>
                        {wowInstallsErr && wowInstallsErr.wow_classic
                          ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic Default Addon Track</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-retail-track-dropdown"
                          title={getDefaultTrackTile(gameDefaults.wow_classic.trackBranch)}
                          onSelect={this.toggleDefaultWowAddonTrack}
                        >
                          <Dropdown.Item
                            gameversion="wow_classic"
                            key={1}
                            eventKey={1}
                          >
                            Release
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_classic"
                            key={2}
                            eventKey={2}
                          >
                            Beta
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_classic"
                            key={3}
                            eventKey={3}
                          >
                            Alpha
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic Default Auto Update</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDefaultWowAutoUpdate}
                              checked={gameDefaults.wow_classic.autoUpdate}
                              gameversion="wow_classic"
                              id="wow_classic_auto_update"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>PTR Install Path</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="ptr-dir-location">
                          <Button
                            className="select-install-dir-button"
                            onClick={() => changeWowInstallDir('wow_retail_ptr')}
                          >
                            {wowInstalls.wow_retail_ptr}
                          </Button>
                        </p>
                        <ReactTooltip id="ptr-dir-location">
                          <span>{wowInstalls.wow_retail_ptr}</span>
                        </ReactTooltip>
                        {wowInstallsErr && wowInstallsErr.wow_retail_ptr
                          ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>PTR Default Addon Track</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-retail-track-dropdown"
                          title={getDefaultTrackTile(gameDefaults.wow_retail_ptr.trackBranch)}
                          onSelect={this.toggleDefaultWowAddonTrack}
                        >
                          <Dropdown.Item
                            gameversion="wow_retail_ptr"
                            key={1}
                            eventKey={1}
                          >
                            Release
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail_ptr"
                            key={2}
                            eventKey={2}
                          >
                            Beta
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail_ptr"
                            key={3}
                            eventKey={3}
                          >
                            Alpha
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Retail PTR Default Auto Update</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDefaultWowAutoUpdate}
                              checked={gameDefaults.wow_retail_ptr.autoUpdate}
                              gameversion="wow_retail_ptr"
                              id="wow_retail_ptr_auto_update"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic PTR Install Path</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="classic-ptr-dir-location">
                          <Button
                            className="select-install-dir-button"
                            onClick={() => changeWowInstallDir('wow_classic_ptr')}
                          >
                            {wowInstalls.wow_classic_ptr}
                          </Button>
                        </p>

                        <ReactTooltip id="classic-ptr-dir-location">
                          <span>{wowInstalls.wow_classic_ptr}</span>
                        </ReactTooltip>
                        {wowInstallsErr && wowInstallsErr.wow_classic_ptr
                          ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic PTR Default Addon Track</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-retail-track-dropdown"
                          title={getDefaultTrackTile(gameDefaults.wow_classic_ptr.trackBranch)}
                          onSelect={this.toggleDefaultWowAddonTrack}
                        >
                          <Dropdown.Item
                            gameversion="wow_classic_ptr"
                            key={1}
                            eventKey={1}
                          >
                            Release
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_classic_ptr"
                            key={2}
                            eventKey={2}
                          >
                            Beta
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_classic_ptr"
                            key={3}
                            eventKey={3}
                          >
                            Alpha
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Classic PTR Default Auto Update</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDefaultWowAutoUpdate}
                              checked={gameDefaults.wow_classic_ptr.autoUpdate}
                              gameversion="wow_classic_ptr"
                              id="wow_classic_ptr_auto_update"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Beta Install Path</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="beta-dir-location">
                          <Button
                            className="select-install-dir-button"
                            onClick={() => changeWowInstallDir('wow_reta_beta')}
                          >
                            {wowInstalls.wow_retail_beta}
                          </Button>
                        </p>
                        <ReactTooltip id="beta-dir-location">
                          <span>{wowInstalls.wow_retail_beta}</span>
                        </ReactTooltip>
                        {wowInstallsErr && wowInstallsErr.wow_retail_beta
                          ? <span className="errorMsg">Couldn&apos;t find game in location</span>
                          : ''}
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Beta Default Addon Track</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <DropdownButton
                          id="default-wow-retail-track-dropdown"
                          title={getDefaultTrackTile(gameDefaults.wow_retail_beta.trackBranch)}
                          onSelect={this.toggleDefaultWowAddonTrack}
                        >
                          <Dropdown.Item
                            gameversion="wow_retail_beta"
                            key={1}
                            eventKey={1}
                          >
                            Release
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail_beta"
                            key={2}
                            eventKey={2}
                          >
                            Beta
                          </Dropdown.Item>
                          <Dropdown.Item
                            gameversion="wow_retail_beta"
                            key={3}
                            eventKey={3}
                          >
                            Alpha
                          </Dropdown.Item>
                        </DropdownButton>
                      </Col>
                    </Row>
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Retail Beta Default Auto Update</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        {appSettings
                          ? (
                            <Switch
                              onChange={this.toggleDefaultWowAutoUpdate}
                              checked={gameDefaults.wow_retail_beta.autoUpdate}
                              gameversion="wow_retail_beta"
                              id="wow_retail_beta_auto_update"
                              onColor="#ED8323"
                              height={20}
                              width={40}
                              activeBoxShadow="0 0 2px 3px #ED8323"
                            />
                          )
                          : ''}
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className="settings-window-section-header">
                    Debug
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} className="settings-section">
                    <Row className="settings-item">
                      <Col xs={4} md={3} className="settings-item-name">
                        <div>Diagnostic Log Files</div>
                      </Col>
                      <Col xs={8} md={9} className="settings-item-config">
                        <p data-tip data-for="log-dir-location">
                          <Button
                            className="open-log-dir-button"
                            onClick={() => openLogDir()}
                          >
                            Show Logs
                          </Button>
                        </p>
                        <ReactTooltip id="log-dir-location">
                          <span>
                            Open the directory that contains Singularity&apos;s diagnostic logs
                          </span>
                        </ReactTooltip>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </div>
            </SimpleBar>
          )
          : ''}
      </div>
    );
  }
}

SettingsWindow.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default SettingsWindow;
