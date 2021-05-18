import './GameWindowMenu.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Tabs, Tab, DropdownButton, Dropdown,
} from 'react-bootstrap';

class GameWindowMenu extends React.Component {
  constructor(props) {
    super(props);
    const {
      installedVersions,
      selectedGameVersion,
    } = this.props;
    const selectedVersionObj = installedVersions
      .filter((obj) => obj.gameVersion === selectedGameVersion)[0];

    this.state = {
      selectedGameVersionNickName: selectedVersionObj.nickName,
    };

    this.toggleUpperMenuTab = this.toggleUpperMenuTab.bind(this);
    this.toggleGameVersion = this.toggleGameVersion.bind(this);
  }

  componentDidUpdate(prevProps) {
    const {
      installedVersions,
      selectedGameVersion,
    } = this.props;
    if (selectedGameVersion !== prevProps.selectedGameVersion) {
      const selectedVersionObj = installedVersions
        .filter((obj) => obj.gameVersion === selectedGameVersion)[0];
      this.setState({
        selectedGameVersionNickName: selectedVersionObj.nickName,
      });
    }
  }

  toggleUpperMenuTab(selectedtab) {
    const {
      toggleActiveTab,
    } = this.props;
    toggleActiveTab(selectedtab);
  }

  toggleGameVersion(gameVersion) {
    const {
      toggleGameVersion,
    } = this.props;
    toggleGameVersion(gameVersion);
  }

  render() {
    const {
      activeTab,
      gameId,
      installedVersions,
    } = this.props;
    const {
      selectedGameVersionNickName,
    } = this.state;
    return (
      <div className="GameWindowMenu">
        <Row className="game-window-menu">
          <Col xs={6} className="window-menu-selector">
            <Tabs
              id="game-window-menu-tabs"
              activeKey={activeTab}
              onSelect={this.toggleUpperMenuTab}
            >
              <Tab eventKey="installed" title="Installed Addons" />
              <Tab eventKey="browse" title="Browse Addons" />
            </Tabs>
          </Col>
          <Col xs={{ span: 4, offset: 2 }} className="game-settings">
            <DropdownButton
              id="game-version-select-dropdown"
              title={selectedGameVersionNickName}
              onSelect={this.toggleGameVersion}
            >
              {installedVersions && installedVersions.map((version) => (
                <Dropdown.Item
                  key={version.gameVersion}
                  eventKey={version.gameVersion}
                >
                  {version.nickName}
                </Dropdown.Item>
              ))}
              {((gameId === 1 && installedVersions && installedVersions.length < 7)
            || (gameId === 2 && installedVersions && installedVersions.length < 2))
                ? <Dropdown.Divider />
                : ''}
              {((gameId === 1 && installedVersions && installedVersions.length < 7)
            || (gameId === 2 && installedVersions && installedVersions.length < 2))
                ? (
                  <Dropdown.Item
                    key="find"
                    eventKey="find"
                  >
                    Find More
                  </Dropdown.Item>
                )
                : ''}
            </DropdownButton>
          </Col>
        </Row>
      </div>
    );
  }
}

GameWindowMenu.propTypes = {
  activeTab: PropTypes.string.isRequired,
  gameId: PropTypes.number.isRequired,
  installedVersions: PropTypes.array,
  selectedGameVersion: PropTypes.string.isRequired,
  toggleActiveTab: PropTypes.func.isRequired,
  toggleGameVersion: PropTypes.func.isRequired,
};

GameWindowMenu.defaultProps = {
  installedVersions: [],
};
export default GameWindowMenu;
