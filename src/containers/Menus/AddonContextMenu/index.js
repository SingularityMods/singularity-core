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
            modules: [],
            trackBranch: 1,
            autoUpdate: false,
            ignoreUpdate: false,
            hoverBranchOption: false,
            hoverBranchMenu: false,
            hoverDirOption: false,
            hoverDirMenu: false,
            hoverSettingsOption: false,
            hoverSettingsMenu: false
        }

        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.onHoverBranchMenu = this.onHoverBranchMenu.bind(this);
        this.onHoverBranchOption = this.onHoverBranchOption.bind(this);
        this.onHoverDirMenu = this.onHoverDirMenu.bind(this);
        this.onHoverDirOption = this.onHoverDirOption.bind(this);
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

    onHoverBranchOption(toggle) {
        if (toggle) {
            this.setState({hoverBranchOption: toggle})
        } else {
            this.hoverBranchOptTimeout = setTimeout( () =>{ this.setState({hoverBranchOption: toggle}) }, 60);
        }
    }

    onHoverBranchMenu(toggle) {
        if (toggle) {
            this.setState({hoverBranchMenu: toggle});
        } else {
            this.hoverBranchMenuTimeout = setTimeout( () =>{ this.setState({hoverBranchMenu: toggle}) }, 60);
        }
    }

    onHoverSettingsOption(toggle) {
        if (toggle) {
            this.setState({hoverSettingsOption: toggle})
        } else {
            this.hoverSettingsOptTimeout = setTimeout( () =>{ this.setState({hoverSettingsOption: toggle}) }, 60);
        }
    }

    onHoverSettingsMenu(toggle) {
        if (toggle) {
            this.setState({hoverSettingsMenu: toggle});
        } else {
            this.hoverSettingsMenuTimeout = setTimeout( () =>{ this.setState({hoverSettingsMenu: toggle}) }, 60);
        }
    }

    onHoverDirOption(toggle) {
        if (toggle) {
            this.setState({hoverDirOption: toggle})
        } else {
            this.hoverDirOptTimeout = setTimeout( () =>{ this.setState({hoverDirOption: toggle}) }, 60);
        }
    }

    onHoverDirMenu(toggle) {
        if (toggle) {
            this.setState({hoverDirMenu: toggle});
        } else {
            this.hoverDirMenuTimeout = setTimeout( () =>{ this.setState({hoverDirMenu: toggle}) }, 60);
        }
    }

    handleClick(event) {
        if (this.state.visible) {
            event.preventDefault();
        }
        this.setState({ visible: false, x: 0, y: 0 });
    }

    handleContextMenu(event) {
        event.preventDefault();
        if (event.path.some(e => e.classList && e.classList.contains('installed-addons-row'))) {
            var row = event.path[1];
            if (row.tagName == 'TD') {
                row = event.path[2]
            } else if (row.tagName == 'DIV' || row.tagName == 'A') {
                if (event.path[0].tagName == 'A' || event.path[0].tagName == 'IMG'){
                    row = event.path[3];
                } else {
                    row = event.path[4];
                }
            }
            var tableCells = row.children;

            let imgSrc = tableCells.item(0).getElementsByClassName("browse-addon-table-img")[0].src;
            let title = tableCells.item(0).getElementsByClassName("browse-addon-name")[0].innerText;
            let installedAddon = this.props.installedAddons.find( (addon) => {
                return addon.addonName == title
            })
            let trackBranch = installedAddon.trackBranch || 1;
            let autoUpdate = installedAddon.autoUpdate || false;
            let ignoreUpdate = installedAddon.ignoreUpdate || false;
            let addonId = installedAddon.addonId;
            let modules = installedAddon.modules;
            let fileName = tableCells.item(2).innerText;
            let installState = tableCells.item(1).firstChild.innerText;

            var clickX = event.pageX - 230;
            var clickY = event.layerY;

            if ((window.innerHeight - event.pageY) < 150) {
                clickY -= 150;

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
                imgSrc: imgSrc,
                title: title,
                fileName: fileName,
                installState: installState,
                addonId: addonId,
                modules: modules,
                trackBranch: trackBranch,
                autoUpdate: autoUpdate,
                ignoreUpdate: ignoreUpdate,
                hoverBranchOption: false,
                hoverBranchMenu: false,
                hoverDirOption: false,
                hoverDirMenu: false,
                hoverSettingsOption: false,
                hoverSettingsMenu: false
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
                modules: [],
                trackBranch: 1,
                autoUpdate: false,
                ignoreUpdate: false,
                hoverBranchOption: false,
                hoverBranchMenu: false,
                hoverDirOption: false,
                hoverDirMenu: false,
                hoverSettingsOption: false,
                hoverSettingsMenu: false
            })
        }
    }

    render() {
        var style = {
            'position': 'absolute',
            'top': `${this.state.y}px`,
            'left': `${this.state.x}px`
        }
        return (
            <div id='cmenu'>
                {this.state.visible
                    ? <Container className="AddonContextMenu" style={style}>
                        <Row className="context-menu-header">
                            <Col xs={12} >
                                <img className="context-menu-header-img" src={this.state.imgSrc} />
                                <h2 className="context-menu-header-title">{this.state.title}</h2>   
                                <h3 className="context-menu-header-file">{this.state.fileName}</h3>
                            </Col>
                            {this.state.hoverDirMenu || this.state.hoverDirOption
                                ? <div
                                    className="context-menu-branch-menu directory-menu"
                                    onMouseEnter={() => this.onHoverDirOption(true)}
                                    onMouseLeave={() => this.onHoverDirOption(false)}>
                                    <Row className="context-menu-header sub-header">
                                        <Col xs={12}>
                                            <h2 className="context-menu-sub-header-title">Browse Folders</h2>
                                        </Col>
                                    </Row>
                                    <Row className="context-menu-body">
                                        {this.state.modules && this.state.modules.map((module, index, a) => (
                                            <Col xs={12} key={index} className="context-menu-item sub-menu-item" onClick={() => this.props.handleOpenDir(module.folderName)}>
                                                <i className="fas fa-folder context-menu-item-icon" /><div className="context-menu-item-lable">{module.folderName}</div>
                                            </Col>
                                        ))}
                                    </Row>
                                    </div>
                                : ''
                            }
                            {this.state.hoverBranchMenu || this.state.hoverBranchOption
                                ? <div 
                                    className="context-menu-branch-menu"
                                    onMouseEnter={() => this.onHoverBranchOption(true)}
                                    onMouseLeave={() => this.onHoverBranchOption(false)}>
                                    <Row className="context-menu-header sub-header">
                                        <Col xs={12}>
                                            <h2 className="context-menu-sub-header-title">Release Branches</h2>
                                        </Col>
                                    </Row>
                                    <Row className="context-menu-body">
                                        <Col xs={12} 
                                            className="context-menu-item sub-menu-item"
                                            onClick={() => this.props.handleChangeBranch(this.state.addonId,1)}>
                                            {this.state.trackBranch == 1
                                                ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                                                : <div><i className="far fa-circle context-menu-item-icon" /></div>
                                            }
                                            <div className="context-menu-item-lable">Release</div>
                                        </Col>
                                        <Col xs={12} 
                                            className="context-menu-item sub-menu-item"
                                            onClick={() => this.props.handleChangeBranch(this.state.addonId,2)}>
                                            {this.state.trackBranch == 2
                                                ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                                                : <div><i className="far fa-circle context-menu-item-icon" /></div>
                                            }
                                            <div className="context-menu-item-lable">Beta</div>
                                        </Col>
                                        <Col xs={12} 
                                            className="context-menu-item sub-menu-item"
                                            onClick={() => this.props.handleChangeBranch(this.state.addonId,3)}>
                                            {this.state.trackBranch == 3
                                                ? <div><i className="fas fa-circle context-menu-item-icon selected" /></div>
                                                : <div><i className="far fa-circle context-menu-item-icon" /></div>
                                            }
                                            <div className="context-menu-item-lable">Alpha</div>
                                        </Col>
                                    </Row>
                                  </div>
                                :''
                            }
                            {this.state.hoverSettingsMenu || this.state.hoverSettingsOption
                                ? <div 
                                    className="context-menu-branch-menu settings-menu"
                                    onMouseEnter={() => this.onHoverSettingsOption(true)}
                                    onMouseLeave={() => this.onHoverSettingsOption(false)}>
                                    <Row className="context-menu-header sub-header">
                                        <Col xs={12}>
                                            <h2 className="context-menu-sub-header-title">Settings</h2>
                                        </Col>
                                    </Row>
                                    <Row className="context-menu-body">
                                        <Col xs={12} 
                                            className="context-menu-item sub-menu-item"
                                            onClick={() => this.props.handleChangeAutoUpdate(this.state.addonId,!this.state.autoUpdate)}>
                                            {this.state.autoUpdate
                                                ? <div><i className="far fa-check-square context-menu-item-icon settings-icon selected" /></div>
                                                : <div><i className="far fa-square context-menu-item-icon settings-icon" /></div>
                                            }
                                            <div className="context-menu-item-lable">Auto Update</div>
                                        </Col>
                                        <Col xs={12} 
                                            className="context-menu-item sub-menu-item"
                                            onClick={() => this.props.handleChangeIgnoreUpdate(this.state.addonId,!this.state.ignoreUpdate)}>
                                            {this.state.ignoreUpdate
                                                ? <div><i className="far fa-check-square context-menu-item-icon settings-icon selected" /></div>
                                                : <div><i className="far fa-square context-menu-item-icon settings-icon" /></div>
                                            }
                                            <div className="context-menu-item-lable">Ignore Updates</div>
                                        </Col>
                                    </Row>
                                  </div>
                                :''
                            }
                        </Row>
                        {(this.state.installState == 'Install')
                            ? <Row className="context-menu-body">
                                    <Col xs={12}>
                                        <Row className="context-menu-item">
                                            <Col xs={12} className="context-install-state">
                                                <div><i className="fas fa-save" /></div><div className="context-menu-item-lable">Install</div>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            : <Row className="context-menu-body">
                                <Col xs={12}>
                                    <Row className="context-menu-item">
                                        {(this.state.installState == 'Updating...')
                                            ? <Col xs={12} className="context-install-state disabled">
                                                    <div><i className="fas fa-save context-menu-item-icon" /></div><div className="context-menu-item-lable" >Currently Updating...</div>
                                                    </Col>
                                            : (this.state.installState == 'Up to Date' || this.state.installState.includes('Missing Files') || this.state.installState.includes('Unknown Version'))
                                                ? <Col xs={12} className="context-install-state" onClick={() => this.props.handleReinstall(this.state.title)}>
                                                    <div><i className="fas fa-save context-menu-item-icon" /></div><div className="context-menu-item-lable" >Reinstall</div>
                                                    </Col>
                                                :   <Col xs={12} className="context-install-state" onClick={() => this.props.handleUpdate(this.state.title)}>
                                                    <div><i className="fas fa-save context-menu-item-icon" /></div><div className="context-menu-item-lable" >Update</div>
                                                    </Col>
                                        }    
                                    </Row>
                                    <Row className="context-menu-item">
                                        <Col xs={12} 
                                            className="context-menu-settings"
                                            onMouseEnter={() => this.onHoverSettingsMenu(true)}
                                            onMouseLeave={() => this.onHoverSettingsMenu(false)}>
                                            <div><i className="fas fa-cog context-menu-item-icon" /></div><div className="context-menu-item-lable">Install Settings</div><div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
                                        </Col>
                                    </Row>
                                    <Row className="context-menu-item">
                                        <Col 
                                            xs={12} 
                                            className="context-menu-settings"
                                            onMouseEnter={() => this.onHoverBranchMenu(true)}
                                            onMouseLeave={() => this.onHoverBranchMenu(false)}>
                                            <div><i className="fas fa-wrench context-menu-item-icon" /></div><div className="context-menu-item-lable">Release Branch</div><div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
                                        </Col>
                                    </Row>
                                    <Row className="context-menu-item">
                                        {this.state.modules && this.state.modules.length == 1
                                            ? <Col xs={12} onClick={() => this.props.handleOpenDir(this.state.modules[0].folderName)}>
                                                <div><i className="fas fa-folder context-menu-item-icon" /></div><div className="context-menu-item-lable">Browse Folder</div>
                                              </Col>
                                            : this.state.modules.length > 1
                                                ? <Col xs={12} 
                                                            onMouseEnter={() => this.onHoverDirMenu(true)}
                                                            onMouseLeave={() => this.onHoverDirMenu(false)}>
                                                    <div><i className="fas fa-folder context-menu-item-icon" /></div><div className="context-menu-item-lable">Browse Folders</div><div><i className="fas fa-chevron-right context-menu-item-arrow" /></div>
                                                  </Col>
                                                : ''
                                        }
                                    </Row>
                                    <Row className="context-menu-item context-uninstall">
                                        <Col xs={12}  onClick={() => this.props.handleUninstall(this.state.title)}>
                                            <div><i className="fas fa-trash context-menu-item-icon" /></div><div className="context-menu-item-lable" >Delete</div>
                                        </Col>
                                    </Row>
                                </Col>   
                            </Row>
                            }
                    </Container>
                    : ''
                }
            </div>
        )
    }
}

AddonContextMenu.propTypes = {
    handleChangeAutoUpdate: PropTypes.func,
    handleChangeBranch: PropTypes.func,
    handleChangeIgnoreUpdate: PropTypes.func,
    handleOpenDir: PropTypes.func,
    handleReinstall: PropTypes.func,
    handleUninstall: PropTypes.func,
    handleUpdate: PropTypes.func,
    installedAddons: PropTypes.array,
}

export default AddonContextMenu;