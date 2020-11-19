import './BrowseAddonsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';
import * as React from 'react';
import { Row, Col, Form, DropdownButton, Dropdown } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import InfiniteScroll from 'react-infinite-scroller'
const { ipcRenderer } = require('electron');

import CategoryButton from '../CategoryButton';
import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import GameMenuButton from '../Buttons/GameMenuButton';

import LoadingSpinner from '../LoadingSpinner';

export default class BrowseAddonsWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            gameId: this.props.gameId,
            gameVersion: this.props.gameVersion,
            addonVersion: '',
            gameName: '',
            installedAddons: [],
            addonList: [],
            hasMoreAddons: true,
            categories: [],
            page: 0,
            pageSize: 50,
            selectedView: 1,
            activeTab: 1,
            errorMessage: '',
            currentlyUpdating: [],
            erroredUpdates: [],
            searchFilter: '',
            typing: false,
            typingTimeout: 0,
            selectedCategory: '',
            noAddonsFound: false,
            additionalAddons: true,
            searching: true,
            loadingMore: false
        }
        this.installAddon = this.installAddon.bind(this);
        this.refreshSearch = this.refreshSearch.bind(this);
        this.toggleView = this.toggleView.bind(this);
        this.loadMoreAddons = this.loadMoreAddons.bind(this);
        this.addonInstalledListener = this.addonInstalledListener.bind(this);
        this.addonSearchListener = this.addonSearchListener.bind(this);
        this.additionalAddonsListener = this.additionalAddonsListener.bind(this);
        this.addonSearchErrorListener = this.addonSearchErrorListener.bind(this);
        this.addonSearchNoResultListener = this.addonSearchNoResultListener.bind(this);
        this.changeFilter = this.changeFilter.bind(this);
        this.toggleCategory = this.toggleCategory.bind(this);
    }
    
    componentDidUpdate(prevProps) {
        
        if (this.props.gameVersion !== prevProps.gameVersion) {
            ipcRenderer.send('addon-search', this.state.gameId, this.state.gameVersion, this.state.searchFilter, 0, this.state.page, this.state.pageSize);
            const gameSettings = ipcRenderer.sendSync('get-game-settings', this.props.gameId);
            const addonVersion = ipcRenderer.sendSync('get-game-addon-version', this.state.gameId, this.props.gameVersion);
            this.setState({
                installedAddons: gameSettings[this.props.gameVersion].installedAddons,
                gameName: gameSettings[this.props.gameVersion].name,
                addonList: [],
                selectedCategory: '',
                page: 0,
                searching: true,
                gameVersion: this.props.gameVersion,
                addonVersion: addonVersion
            });
        }
    }
    
    componentDidMount() {
        ipcRenderer.send('addon-search', this.state.gameId, this.state.gameVersion, this.state.searchFilter, this.state.selectedCategory, this.state.page, this.state.pageSize);
        ipcRenderer.on('addon-installed', this.addonInstalledListener);
        ipcRenderer.on('addon-search-result', this.addonSearchListener);
        ipcRenderer.on('additional-addon-search-result', this.additionalAddonsListener);
        ipcRenderer.on('addon-search-error', this.addonSearchErrorListener);
        ipcRenderer.on('addon-search-no-result', this.addonSearchNoResultListener);
        const gameSettings = ipcRenderer.sendSync('get-game-settings', this.state.gameId);
        var categories = ipcRenderer.sendSync('get-game-addon-categories', this.state.gameId);
        const addonVersion = ipcRenderer.sendSync('get-game-addon-version', this.state.gameId, this.state.gameVersion);
        categories.unshift({
            'categoryId': 0,
            'name': 'All',
            'parentCategoryId': 0,
            'rootCategoryId': 0,
        })
        this.setState({
            gameName: gameSettings[this.state.gameVersion].name,
            installedAddons: gameSettings[this.state.gameVersion].installedAddons,
            categories: categories,
            searching: true,
            'addonVersion': addonVersion
        });
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('addon-installed', this.addonInstalledListener);
        ipcRenderer.removeListener('addon-search-result', this.addonSearchListener);
        ipcRenderer.removeListener('additional-addon-search-result', this.additionalAddonsListener);
        ipcRenderer.removeListener('additional-addon-search-result', this.additionalAddonsListener);
        ipcRenderer.removeListener('addon-search-error', this.addonSearchErrorListener);
    }

    addonInstalledListener(event, installedAddon) {
        let installedAddons = this.state.installedAddons.map((addon) => {
            if (addon.addonId !== installedAddon.addonId) {
                return addon;
            } else {
                return installedAddon;
            }
        })
        if (!installedAddons.includes(installedAddon)) {
            installedAddons.splice(0, 0, installedAddon)
        }

        let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
            return obj !== installedAddon.addonId;
        })
        let erroredUpdates = this.state.erroredUpdates.filter(obj => {
            return obj !== installedAddon.addonId;
        })
        this.setState({
            installedAddons: installedAddons,
            currentlyUpdating: currentlyUpdating,
            erroredUpdates: erroredUpdates
        });
    }

    addonSearchListener(event, addons) {
        if (addons && addons.length > 0) {
            this.setState({
                addonList: addons,
                noAddonsFound: false,
                searching: false,
                loadingMore: false
            })
        } else {
            this.setState({
                addonList: addons,
                noAddonsFound: true,
                searching: false,
                loadingMore: false
            })
        }
    }

    addonSearchNoResultListener(event) {
        this.setState({
            searching: false,
            loadingMore: false,
            additionalAddons: false
        });
    }

    addonSearchErrorListener(event) {
        this.setState({
            searching: false,
            loadingMore: false,
            additionalAddons: false
        });
    }

    additionalAddonsListener(event, addons) {
        var a = this.state.addonList;
        var newPage = this.state.page + 1;
        if (addons && addons.length > 0) {
            this.setState({
                addonList: a.concat(addons),
                page: newPage,
                noAddonsFound: false,
                searching: false,
                loadingMore: false
            })
        } else {
            this.setState({
                page: newPage,
                additionalAddons: false,
                searching: false
            })
        }
    }

    installAddon(addon) {
        let branch = 1;
        ipcRenderer.send('install-addon', this.state.gameId, this.state.gameVersion, addon, branch);
        let currentlyUpdating = this.state.currentlyUpdating.slice();
        currentlyUpdating.splice(0, 0, addon.addonId)
        this.setState({
            currentlyUpdating: currentlyUpdating
        });

        setTimeout(() => {
            
            if (this.state.currentlyUpdating.includes(addon.addonId)) {
                let erroredUpdates = this.state.erroredUpdates.slice();
                erroredUpdates.splice(0, 0, addon.addonId);
                let currentlyUpdating = this.state.currentlyUpdating.filter(obj => {
                    return obj !== addon.addonId;
                })

                this.setState({
                    erroredUpdates: erroredUpdates,
                    currentlyUpdating: currentlyUpdating
                });
            }
        }, 30000);
    }


    refreshSearch = () => {
        this.setState({
            addonList: [],
            searching: true,
            page: 0,
            additionalAddons: true,
            currentlyUpdating: [],
            erroredUpdates: []

        })
        ipcRenderer.send('addon-search', this.state.gameId, this.state.gameVersion, this.state.searchFilter, this.state.selectedCategory, this.state.page, this.state.pageSize);
    }

    loadMoreAddons = () => {
        ipcRenderer.send('addon-search', this.state.gameId, this.state.gameVersion, this.state.searchFilter, this.state.selectedCategory, this.state.page + 1, this.state.pageSize);
        this.setState({
            loadingMore: true
        })
    }


    toggleView(selectedtab) {
        this.setState({
            selectedView: selectedtab
        });
        
    }

    toggleCategory = (category) => {
        
        if (category == null) {
            category = 0
        }

        ipcRenderer.send('addon-search', this.state.gameId, this.state.gameVersion, this.state.searchFilter, category, 0, this.state.pageSize);
        this.setState({
            selectedCategory: category,
            page: 0,
            searching: true
        })
    }

    changeFilter = (event) => {
        const self = this;

        if (this.state.typingTimeout) {
            clearTimeout(this.state.typingTimeout);
        }

        this.setState({
            searchFilter: event.target.value,
            typing: false,
            typingTimeout: setTimeout(function () {
                self.refreshSearch();
            }, 700)
        });
    }

    render() {
        var selectedCat = this.state.categories.filter(category => {
            return parseInt(category.categoryId) === parseInt(this.state.selectedCategory)
        })
        var selectedCategoryName = 'Category';
        if (selectedCat.length > 0) {
            selectedCategoryName = selectedCat[0].name
        }
        const browseAddonsColumns = [{
            dataField: 'addonName',
            text: 'Addon',
            formatter: (cellContent, row, rowIndex) => {
                if (!row.primaryCategory) {
                    console.log(row);
                }
                return (
                    <div className="browse-addon-title-column">
                        <img className="browse-addon-table-img" src={row.primaryCategory.iconUrl} />
                        <a href="#" className="browse-addon-name" onClick={() => this.props.onSelectAddon(row.addonId)}>{cellContent}</a>
                    </div>
                );
            }
        }, {
            dataField: 'addonId',
                text: 'Action',
                formatExtraData: {
                    installedAddons: this.state.installedAddons,
                    gameVersion: this.state.gameVersion,
                    addonVersion: this.state.addonVersion,
                    currentlyUpdating: this.state.currentlyUpdating,
                    erroredUpdates: this.state.erroredUpdates
                },
                formatter: (cellContent, row, rowIndex, extraData) => {
                    if (extraData.erroredUpdates.includes(row.addonId)) {
                        return <span className="label label-danger">ERROR...</span>;
                    } else if (extraData.currentlyUpdating.includes(row.addonId)) {
                        return (
                            <span className="label label-danger">Updating...</span>
                        );
                    } else {
                        let installed = false;
                        var installedFileDate;
                        for (var i = 0; i < extraData.installedAddons.length; i++) {
                            if (extraData.installedAddons[i].addonId == cellContent.toString()) {
                                installed = true;
                                installedFileDate = Date.parse(extraData.installedAddons[i].fileDate);
                            }
                        }
                        if (!installed) {
                            return (
                                <UpdateAddonButton handleClick={this.installAddon} clickData={row} type='Install' />
                            );
                        }
                        else {
                            for (var i = 0; i < row.latestFiles.length; i++) {
                                if (row.latestFiles[i].gameVersionFlavor == extraData.addonVersion && row.latestFiles[i].releaseType == 1) {
                                    const fileDate = Date.parse(row.latestFiles[i].fileDate);
                                    if (fileDate > installedFileDate) {
                                        return (
                                            <UpdateAddonButton handleClick={this.installAddon} clickData={row} type='Update' />
                                        );
                                    } else {
                                        return (
                                            <span className="label label-danger">Up To Date</span>
                                        );
                                    }

                                }
                            }

                        }
                    }
                    
            }
        }, {
            dataField: 'totalDownloadCount',
                text: 'Downloads',
                formatter: (cellContent, row, rowIndex) => {
                    if (cellContent > 1000000) {
                        var downloadCount = cellContent.toString().slice(0, -5);
                        let lastNum = downloadCount.charAt(downloadCount.length - 1);
                        return downloadCount.slice(0, -1) + '.' + lastNum + "M";
                    } else if (cellContent > 1000) {
                        var downloadCount = cellContent.toString().slice(0, -2);
                        let lastNum = downloadCount.charAt(downloadCount.length - 1);
                        return downloadCount.slice(0, -1) + '.' + lastNum + "K";
                    } else {
                        return cellContent;
                    }
                }
        }, {
            dataField: 'latestFiles',
            text: 'Latest',
            formatExtraData: this.state.gameVersion,
            formatter: (cellContent, row, rowIndex, gameVersion) => {
                for (var i = 0; i < cellContent.length; i++) {
                    if (cellContent[i].gameVersionFlavor == gameVersion && cellContent[i].releaseType == 1) {
                        const fileDate = new Date(Date.parse(cellContent[i].fileDate));
                        let [month, date, year] = fileDate.toLocaleDateString().split("/");
                        return (
                            year + '-' + month + '-' + date
                        );
                    }
                }
            }
            }, {
                dataField: 'categories',
                text: 'Category',
                formatter: (cellContent, row, rowIndex) => {
                    if (cellContent[0] && cellContent[0].name) {
                        return (
                            cellContent[0].name
                        );
                    }
                    return('')
                    
                }
            }, {
                dataField: 'category',
                isDummyField: true,
                text: 'Game Version',
                formatExtraData: this.state.addonVersion,
                formatter: (cellContent, row, rowIndex, addonVersion) => {
                    for (var i = 0; i < row.latestFiles.length; i++) {
                        if (row.latestFiles[i].gameVersionFlavor == addonVersion && row.latestFiles[i].releaseType == 1) {
                            return (
                                row.latestFiles[i].gameVersion[0]
                            );
                        }
                    }
                }
            }, {
                dataField: 'author',
                text: 'Author'
            }]
        return (
            <div className="BrowseAddonsWindow">
                <Row>
                    <Col className="browse-addon-window-content">
                        <Row className="addon-window-menu">
                            <Col xs={7} className="browse-addon-buttons">
                                <div className="browse-addon-game-button"><GameMenuButton handleClick={this.refreshSearch} type='Refresh' /></div>
                                <div className="browse-addon-game-button hidden"><GameMenuButton handleClick={() => { }} type='Featured' /></div>
                                
                                <DropdownButton id="category-dropdown"
                                    title={selectedCategoryName}
                                    onSelect={this.toggleCategory}>
                                    {this.state.categories && this.state.categories.map((category, index, a) => (
                                        <Dropdown.Item
                                            key={category.categoryId}
                                            eventKey={category.categoryId}
                                        >{category.name}</Dropdown.Item>
                                    ))}
                                </DropdownButton>
                                
                            </Col>
                            <Col xs={5}>
                                <Form.Group>
                                    <Form.Control
                                        type='text'
                                        name='searchFilter'
                                        className='addon-search-field'
                                        placeholder='Search'
                                        defaultValue={this.state.searchFilter}
                                        onChange={this.changeFilter.bind(this)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        {!this.state.searching
                            ? (this.state.selectedView == 'featured'
                                ? (<div className="category-window">
                                        <Row>
                                            <h1 className="category-window-title">Categories</h1>
                                        </Row>
                                        <Row className="category-selection">
                                            {this.state.categories && this.state.categories.map((category, index, a) => (
                                                <CategoryButton
                                                    key={category.categoryId}
                                                    categoryId={category.categoryId}
                                                    categoryName={category.name}
                                                    categoryIcon={category.iconUrl} />
                                            ))}
                                        </Row>
                                    </div>
                                ) : (
                                    this.state.noAddonsFound
                                        ? <div className="search-error">Looks like we couldn't find any addons for that search...</div> 
                                        : <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? "addon-table-scrollbar mac" : "addon-table-scrollbar"} >
                                            <Row className="addon-table">
                                                <Col xs={12}>
                                                    {this.state.addonList ? (
                                                        <BootstrapTable
                                                            keyField={'addonId'}
                                                            className="browse-addon-table"
                                                            headerClasses='browse-addons-header'
                                                            data={this.state.addonList}
                                                            columns={browseAddonsColumns}>
                                                        </BootstrapTable>
                                                    ) : (
                                                            ''
                                                        )}
                                                </Col>
                                            </Row>
                                            {this.state.loadingMore
                                                ? <LoadingSpinner />
                                                : ''
                                            }
                                            <Row>
                                                <Col xs={12}>
                                                    {this.state.additionalAddons
                                                        ? <div className="load-more" onClick={this.loadMoreAddons}>load more</div>
                                                        :''
                                                    }
                                                    
                                                </Col>
                                            </Row>

                                        </SimpleBar>
                                    )
                        ): (
                            <div className = "loading"><LoadingSpinner /></div>   
                        )}
                    </Col> 
                </Row>
            </div>
        )
    }
}