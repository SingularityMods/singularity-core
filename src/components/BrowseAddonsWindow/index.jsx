import './BrowseAddonsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';
import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Form, DropdownButton, Dropdown,
} from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import GameMenuButton from '../Buttons/GameMenuButton';

import LoadingSpinner from '../LoadingSpinner';

const { ipcRenderer } = require('electron');

class BrowseAddonsWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      addonVersion: '',
      installedAddons: [],
      addonList: [],
      categories: [],
      page: 0,
      pageSize: 50,
      currentlyUpdating: [],
      erroredUpdates: [],
      searchFilter: '',
      typingTimeout: 0,
      selectedCategory: '',
      noAddonsFound: false,
      additionalAddons: true,
      searching: true,
      loadingMore: false,
    };
    this.installAddon = this.installAddon.bind(this);
    this.refreshSearch = this.refreshSearch.bind(this);
    this.loadMoreAddons = this.loadMoreAddons.bind(this);
    this.timeoutAddon = this.timeoutAddon.bind(this);
    this.addonInstalledListener = this.addonInstalledListener.bind(this);
    this.addonSearchListener = this.addonSearchListener.bind(this);
    this.additionalAddonsListener = this.additionalAddonsListener.bind(this);
    this.addonSearchErrorListener = this.addonSearchErrorListener.bind(this);
    this.addonSearchNoResultListener = this.addonSearchNoResultListener.bind(this);
    this.changeFilter = this.changeFilter.bind(this);
    this.toggleCategory = this.toggleCategory.bind(this);
  }

  componentDidMount() {
    const {
      page,
      pageSize,
      searchFilter,
      selectedCategory,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('addon-search', gameId, gameVersion, searchFilter, selectedCategory, page, pageSize);
    ipcRenderer.on('addon-installed', this.addonInstalledListener);
    ipcRenderer.on('addon-search-result', this.addonSearchListener);
    ipcRenderer.on('additional-addon-search-result', this.additionalAddonsListener);
    ipcRenderer.on('addon-search-error', this.addonSearchErrorListener);
    ipcRenderer.on('addon-search-no-result', this.addonSearchNoResultListener);
    const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
    const categories = ipcRenderer.sendSync('get-game-addon-categories', gameId);
    const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
    categories.unshift({
      categoryId: 0,
      name: 'All',
      parentCategoryId: 0,
      rootCategoryId: 0,
    });
    this.setState({
      installedAddons: gameSettings[gameVersion].installedAddons,
      categories,
      searching: true,
      addonVersion,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      page,
      pageSize,
      searchFilter,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    if (gameVersion !== prevProps.gameVersion) {
      ipcRenderer.send('addon-search', gameId, gameVersion, searchFilter, 0, page, pageSize);
      const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
      const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
      this.setState({
        installedAddons: gameSettings[gameVersion].installedAddons,
        addonList: [],
        selectedCategory: '',
        page: 0,
        searching: true,
        addonVersion,
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('addon-installed', this.addonInstalledListener);
    ipcRenderer.removeListener('addon-search-result', this.addonSearchListener);
    ipcRenderer.removeListener('additional-addon-search-result', this.additionalAddonsListener);
    ipcRenderer.removeListener('additional-addon-search-result', this.additionalAddonsListener);
    ipcRenderer.removeListener('addon-search-error', this.addonSearchErrorListener);
  }

  addonInstalledListener(_event, installedAddon) {
    const {
      currentlyUpdating,
      erroredUpdates,
      installedAddons,
    } = this.state;
    const currentlyInstalledAddons = installedAddons.map((addon) => {
      if (addon.addonId !== installedAddon.addonId) {
        return addon;
      }
      return installedAddon;
    });
    if (!currentlyInstalledAddons.includes(installedAddon)) {
      currentlyInstalledAddons.splice(0, 0, installedAddon);
    }

    const newCurrentlyUpdating = currentlyUpdating.filter((obj) => obj !== installedAddon.addonId);
    const newErroredUpdates = erroredUpdates.filter((obj) => obj !== installedAddon.addonId);
    this.setState({
      installedAddons: currentlyInstalledAddons,
      currentlyUpdating: newCurrentlyUpdating,
      erroredUpdates: newErroredUpdates,
    });
  }

  addonSearchListener(_event, addons) {
    if (addons && addons.length > 0) {
      this.setState({
        addonList: addons,
        noAddonsFound: false,
        searching: false,
        loadingMore: false,
      });
    } else {
      this.setState({
        addonList: addons,
        noAddonsFound: true,
        searching: false,
        loadingMore: false,
      });
    }
  }

  addonSearchNoResultListener() {
    this.setState({
      searching: false,
      loadingMore: false,
      additionalAddons: false,
    });
  }

  addonSearchErrorListener() {
    this.setState({
      searching: false,
      loadingMore: false,
      additionalAddons: false,
    });
  }

  additionalAddonsListener(_event, addons) {
    const {
      addonList,
      page,
    } = this.state;
    const a = addonList;
    const newPage = page + 1;
    if (addons && addons.length > 0) {
      this.setState({
        addonList: a.concat(addons),
        page: newPage,
        noAddonsFound: false,
        searching: false,
        loadingMore: false,
      });
    } else {
      this.setState({
        page: newPage,
        additionalAddons: false,
        searching: false,
      });
    }
  }

  timeoutAddon(addon) {
    const {
      currentlyUpdating,
      erroredUpdates,
    } = this.state;
    if (currentlyUpdating.includes(addon.addonId)) {
      const newErroredUpdates = erroredUpdates.slice();
      erroredUpdates.splice(0, 0, addon.addonId);
      const newCurrentlyUpdating = currentlyUpdating.filter((obj) => obj !== addon.addonId);

      this.setState({
        erroredUpdates: newErroredUpdates,
        currentlyUpdating: newCurrentlyUpdating,
      });
    }
  }

  installAddon(addon) {
    const {
      currentlyUpdating,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const branch = 1;
    ipcRenderer.send('install-addon', gameId, gameVersion, addon, branch);
    const newCurrentlyUpdating = currentlyUpdating.slice();
    currentlyUpdating.splice(0, 0, addon.addonId);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
    });

    setTimeout(() => {
      this.timeoutAddon(addon);
    }, 30000);
  }

  refreshSearch() {
    const {
      searchFilter,
      selectedCategory,
      page,
      pageSize,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    this.setState({
      addonList: [],
      searching: true,
      page: 0,
      additionalAddons: true,
      currentlyUpdating: [],
      erroredUpdates: [],

    });
    ipcRenderer.send('addon-search', gameId, gameVersion, searchFilter, selectedCategory, page, pageSize);
  }

  loadMoreAddons() {
    const {
      searchFilter,
      selectedCategory,
      page,
      pageSize,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.send('addon-search', gameId, gameVersion, searchFilter, selectedCategory, page + 1, pageSize);
    this.setState({
      loadingMore: true,
    });
  }

  toggleCategory(category) {
    const {
      searchFilter,
      pageSize,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const searchCategory = category || 0;

    ipcRenderer.send('addon-search', gameId, gameVersion, searchFilter, searchCategory, 0, pageSize);
    this.setState({
      selectedCategory: category,
      page: 0,
      searching: true,
    });
  }

  changeFilter(event) {
    const self = this;
    const {
      typingTimeout,
    } = this.state;
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    this.setState({
      searchFilter: event.target.value,
      typingTimeout: setTimeout(() => {
        self.refreshSearch();
      }, 700),
    });
  }

  render() {
    const {
      additionalAddons,
      addonList,
      addonVersion,
      categories,
      currentlyUpdating,
      erroredUpdates,
      installedAddons,
      loadingMore,
      noAddonsFound,
      selectedCategory,
      searchFilter,
      searching,
    } = this.state;
    const {
      gameVersion,
      onSelectAddon,
    } = this.props;
    const selectedCat = categories.filter((category) => (
      parseInt(category.categoryId, 10) === parseInt(selectedCategory, 10)));
    let selectedCategoryName = 'Category';
    if (selectedCat.length > 0) {
      selectedCategoryName = selectedCat[0].name;
    }
    const browseAddonsColumns = [{
      dataField: 'addonName',
      text: 'Addon',
      formatter: (cellContent, row) => (
        <div className="browse-addon-title-column">
          <img className="browse-addon-table-img" alt="Addon icon" src={row.primaryCategory.iconUrl} />
          <div
            className="browse-addon-name"
            role="button"
            tabIndex="0"
            onClick={() => onSelectAddon(row.addonId)}
            onKeyPress={() => onSelectAddon(row.addonId)}
          >
            {cellContent}
          </div>
        </div>
      ),
    }, {
      dataField: 'addonId',
      text: 'Action',
      formatExtraData: {
        installedAddons,
        gameVersion,
        addonVersion,
        currentlyUpdating,
        erroredUpdates,
      },
      formatter: (cellContent, row, rowIndex, extraData) => {
        if (extraData.erroredUpdates.includes(row.addonId)) {
          return <span className="label label-danger">ERROR...</span>;
        } if (extraData.currentlyUpdating.includes(row.addonId)) {
          return (
            <span className="label label-danger">Updating...</span>
          );
        }
        let installed = false;
        let installedFileDate;
        for (let i = 0; i < extraData.installedAddons.length; i += 1) {
          if (extraData.installedAddons[i].addonId === cellContent.toString()) {
            installed = true;
            installedFileDate = Date.parse(extraData.installedAddons[i].fileDate);
          }
        }
        if (!installed) {
          return (
            <UpdateAddonButton handleClick={this.installAddon} clickData={row} type="Install" />
          );
        }

        for (let i = 0; i < row.latestFiles.length; i += 1) {
          if (row.latestFiles[i].gameVersionFlavor === extraData.addonVersion
              && row.latestFiles[i].releaseType === 1) {
            const fileDate = Date.parse(row.latestFiles[i].fileDate);
            if (fileDate > installedFileDate) {
              return (
                <UpdateAddonButton handleClick={this.installAddon} clickData={row} type="Update" />
              );
            }
          }
        }
        return (
          <span className="label label-danger">Up To Date</span>
        );
      },
    }, {
      dataField: 'totalDownloadCount',
      text: 'Downloads',
      formatter: (cellContent) => {
        if (cellContent > 1000000) {
          const downloadCount = cellContent.toString().slice(0, -5);
          const lastNum = downloadCount.charAt(downloadCount.length - 1);
          return `${downloadCount.slice(0, -1)}.${lastNum}M`;
        } if (cellContent > 1000) {
          const downloadCount = cellContent.toString().slice(0, -2);
          const lastNum = downloadCount.charAt(downloadCount.length - 1);
          return `${downloadCount.slice(0, -1)}.${lastNum}K`;
        }
        return cellContent;
      },
    }, {
      dataField: 'latestFiles',
      text: 'Latest',
      formatExtraData: gameVersion,
      formatter: (cellContent, row, rowIndex, gameV) => {
        for (let i = 0; i < cellContent.length; i += 1) {
          if (cellContent[i].gameVersionFlavor === gameV && cellContent[i].releaseType === 1) {
            const fileDate = new Date(Date.parse(cellContent[i].fileDate));
            const [month, date, year] = fileDate.toLocaleDateString().split('/');
            return (
              `${year}-${month}-${date}`
            );
          }
        }
        return '';
      },
    }, {
      dataField: 'categories',
      text: 'Category',
      formatter: (cellContent) => {
        if (cellContent[0] && cellContent[0].name) {
          return (
            cellContent[0].name
          );
        }
        return ('');
      },
    }, {
      dataField: 'category',
      isDummyField: true,
      text: 'Game Version',
      formatExtraData: addonVersion,
      formatter: (cellContent, row, rowIndex, addonV) => {
        for (let i = 0; i < row.latestFiles.length; i += 1) {
          if (row.latestFiles[i].gameVersionFlavor === addonV
              && row.latestFiles[i].releaseType === 1
          ) {
            return (
              row.latestFiles[i].gameVersion[0]
            );
          }
        }
        return '';
      },
    }, {
      dataField: 'author',
      text: 'Author',
    }];
    return (
      <div className="BrowseAddonsWindow">
        <Row>
          <Col className="browse-addon-window-content">
            <Row className="addon-window-menu">
              <Col xs={7} className="browse-addon-buttons">
                <div className="browse-addon-game-button"><GameMenuButton handleClick={this.refreshSearch} type="Refresh" /></div>
                <div className="browse-addon-game-button hidden"><GameMenuButton handleClick={() => { }} type="Featured" /></div>

                <DropdownButton
                  id="category-dropdown"
                  title={selectedCategoryName}
                  onSelect={this.toggleCategory}
                >
                  {categories && categories.map((category) => (
                    <Dropdown.Item
                      key={category.categoryId}
                      eventKey={category.categoryId}
                    >
                      {category.name}
                    </Dropdown.Item>
                  ))}
                </DropdownButton>

              </Col>
              <Col xs={5}>
                <Form.Group>
                  <Form.Control
                    type="text"
                    name="searchFilter"
                    className="addon-search-field"
                    placeholder="Search"
                    defaultValue={searchFilter}
                    onChange={this.changeFilter}
                  />
                </Form.Group>
              </Col>
            </Row>
            {searching
              ? <div className="loading"><LoadingSpinner /></div>
              : ''}
            {!searching && noAddonsFound
              ? <div className="search-error">Looks like we couldn&apos;t find any addons for that search...</div>
              : ''}
            {!searching && !noAddonsFound
              ? (
                <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? 'addon-table-scrollbar mac' : 'addon-table-scrollbar'}>
                  <Row className="addon-table">
                    <Col xs={12}>
                      {addonList ? (
                        <BootstrapTable
                          keyField="addonId"
                          className="browse-addon-table"
                          headerClasses="browse-addons-header"
                          data={addonList}
                          columns={browseAddonsColumns}
                        />
                      ) : (
                        ''
                      )}
                    </Col>
                  </Row>
                  {loadingMore
                    ? <LoadingSpinner />
                    : ''}
                  <Row>
                    <Col xs={12}>
                      {additionalAddons
                        ? <div className="load-more" role="button" tabIndex="0" onClick={this.loadMoreAddons} onKeyPress={this.loadMoreAddons}>load more</div>
                        : ''}
                    </Col>
                  </Row>
                </SimpleBar>
              )
              : ''}
          </Col>
        </Row>
      </div>
    );
  }
}

BrowseAddonsWindow.propTypes = {
  gameId: PropTypes.number.isRequired,
  gameVersion: PropTypes.string.isRequired,
  onSelectAddon: PropTypes.func.isRequired,
};

export default BrowseAddonsWindow;
