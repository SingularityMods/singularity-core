import './GameWindowMenu.css';

import * as React from 'react';
import { Row, Col, Tabs, Tab, Button, DropdownButton, Dropdown } from 'react-bootstrap';

export default class GameWindowMenu extends React.Component {
    constructor(props) {
        super(props);
        var selectedVersionObj = this.props.installedVersions.filter(obj => {
            return obj.gameVersion === this.props.selectedGameVersion
        })[0];

        this.state = {
            activeTab: 'installed',
            gameId: this.props.gameId,
            selectedGameVersion: this.props.selectedGameVersion,
            selectedGameVersionNickName: selectedVersionObj.nickName,
            installedVersions: this.props.installedVersions
        }

        this.toggleUpperMenuTab = this.toggleUpperMenuTab.bind(this);
        this.toggleGameVersion = this.toggleGameVersion.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.activeTab !== prevProps.activeTab) {
            this.setState({
                activeTab: this.props.activeTab
            })
        }
        if (this.props.selectedGameVersion !== prevProps.selectedGameVersion) {
            var selectedVersionObj = this.props.installedVersions.filter(obj => {
                return obj.gameVersion === this.props.selectedGameVersion
            })[0];
            this.setState({
                selectedGameVersion: this.props.selectedGameVersion,
                selectedGameVersionNickName: selectedVersionObj.nickName
            })
        }
        if (this.props.installedVersions !== prevProps.installedVersions) {
            this.setState({
                installedVersions: this.props.installedVersions
            })
        }
    }

    toggleUpperMenuTab(selectedtab) {
        this.props.toggleActiveTab(selectedtab);
    }

    toggleGameVersion(gameVersion) {
        this.props.toggleGameVersion(gameVersion);
    }

    

    render() {
        return (
            <div className="GameWindowMenu">
                <Row className="game-window-menu">
                    <Col xs={6} className="window-menu-selector">
                        <Tabs
                            id="game-window-menu-tabs"
                            activeKey={this.state.activeTab}
                            onSelect={this.toggleUpperMenuTab}
                        >
                            <Tab eventKey="installed" title="Installed Addons">
                            </Tab>
                            <Tab eventKey="browse" title="Browse Addons">
                            </Tab>
                        </Tabs>
                    </Col>
                    <Col xs={{ span: 4, offset: 2 }} className="game-settings">
                        <DropdownButton id="game-version-select-dropdown"
                            title={this.state.selectedGameVersionNickName}
                            onSelect={this.toggleGameVersion}>
                            {this.state.installedVersions && this.state.installedVersions.map((version, index, a) => (
                                <Dropdown.Item
                                    key={version.gameVersion}
                                    eventKey={version.gameVersion}
                                >{version.nickName}</Dropdown.Item> 
                            ))}
                            {(this.state.installedVersions && this.state.installedVersions.length < 5)
                                ? <Dropdown.Divider />
                                : ''
                            }
                            {(this.state.installedVersions && this.state.installedVersions.length < 5)
                                ? <Dropdown.Item
                                    key='find'
                                    eventKey='find'
                                >Find More</Dropdown.Item> 
                                : ''
                            }
                        </DropdownButton>
                        
                    </Col>
                </Row>
            </div>
        )
    }
}