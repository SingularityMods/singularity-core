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

function getLatestFile(addon, addonVersion) {
  let possibleFiles = addon.latestFiles.filter((file) => (
    file.gameVersionFlavor === addonVersion && file.releaseType <= addon.trackBranch
  ));
  if (!possibleFiles || possibleFiles.length === 0) {
    possibleFiles = addon.latestFiles.filter((file) => file.gameVersionFlavor === addonVersion);
    return possibleFiles.reduce((a, b) => ((a.releaseType < b.releaseType) ? a : b));
  }
  return possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
}

class BrowseAddonsWindow extends React.Component {
  constructor(props) {
    super(props);
    const {
      filter,
      sort,
      sortOrder,
    } = this.props;
    this.state = {
      addonVersion: '',
      installedAddons: [],
      addonList: [],
      categories: [],
      page: 0,
      pageSize: 50,
      sort,
      sortOrder,
      currentlyUpdating: [],
      erroredUpdates: [],
      searchFilter: filter,
      typingTimeout: 0,
      selectedCategory: '',
      additionalAddons: true,
      searching: true,
      loadingMore: false,
    };
    this.handleAddonSearchResult = this.handleAddonSearchResult.bind(this);
    this.installAddon = this.installAddon.bind(this);
    this.refreshSearch = this.refreshSearch.bind(this);
    this.loadMoreAddons = this.loadMoreAddons.bind(this);
    this.handleSelectAddon = this.handleSelectAddon.bind(this);
    this.addonInstalledListener = this.addonInstalledListener.bind(this);
    this.changeFilter = this.changeFilter.bind(this);
    this.clearSearchFilter = this.clearSearchFilter.bind(this);
    this.toggleCategory = this.toggleCategory.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  componentDidMount() {
    const {
      page,
      pageSize,
      searchFilter,
      selectedCategory,
      sort,
      sortOrder,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    ipcRenderer.on('addon-installed', this.addonInstalledListener);
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
    ipcRenderer.invoke('search-for-addons', gameId, gameVersion, searchFilter, selectedCategory, page, pageSize, sort, sortOrder)
      .then((addons) => {
        this.handleAddonSearchResult(addons);
      })
      .catch(() => {
        this.setState({
          searching: false,
          loadingMore: false,
          additionalAddons: false,
        });
      });
  }

  componentDidUpdate(prevProps) {
    const {
      page,
      pageSize,
    } = this.state;
    const {
      filter,
      gameId,
      gameVersion,
      sort,
      sortOrder,
    } = this.props;
    if (gameVersion !== prevProps.gameVersion) {
      const gameSettings = ipcRenderer.sendSync('get-game-settings', gameId);
      const addonVersion = ipcRenderer.sendSync('get-game-addon-version', gameId, gameVersion);
      this.setState({
        installedAddons: gameSettings[gameVersion].installedAddons,
        addonList: [],
        selectedCategory: '',
        searchFilter: filter,
        page: 0,
        searching: true,
        addonVersion,
        sort,
        sortOrder,
      });
      ipcRenderer.invoke('search-for-addons', gameId, gameVersion, filter, 0, page, pageSize, 1, 1)
        .then((addons) => {
          this.handleAddonSearchResult(addons);
        })
        .catch(() => {
          this.setState({
            searching: false,
            loadingMore: false,
            additionalAddons: false,
          });
        });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('addon-installed', this.addonInstalledListener);
  }

  handleAddonSearchResult(addons) {
    const {
      page,
      addonList,
    } = this.state;
    if (!addons || addons.length === 0) {
      return this.setState({
        searching: false,
        loadingMore: false,
        additionalAddons: false,
      });
    }
    if (page === 0) {
      return this.setState({
        addonList: addons,
        searching: false,
        loadingMore: false,
      });
    }

    return this.setState({
      addonList: addonList.concat(addons),
      page: page + 1,
      searching: false,
      loadingMore: false,
    });
  }

  handleSelectAddon(addonId) {
    const { onSelectAddon } = this.props;
    const { searchFilter, sort, sortOrder } = this.state;
    onSelectAddon(addonId, searchFilter, sort, sortOrder);
  }

  handleSort(field) {
    const {
      searchFilter,
      selectedCategory,
      pageSize,
      sort,
      sortOrder,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    let newSort = 1;
    let newSortOrder = 1;
    switch (field) {
      case 'totalDownloadCount':
        newSort = 1;
        if (sort === newSort && sortOrder === 1) {
          newSortOrder = 2;
        } else {
          newSortOrder = 1;
        }
        break;
      case 'addonName':
        newSort = 2;
        if (sort === newSort && sortOrder === 1) {
          newSortOrder = 2;
        } else {
          newSortOrder = 1;
        }
        break;
      case 'latestFiles':
        newSort = 3;
        if (sort === newSort && sortOrder === 1) {
          newSortOrder = 2;
        } else {
          newSortOrder = 1;
        }
        break;
      case 'gameVersion':
        newSort = 4;
        if (sort === newSort && sortOrder === 1) {
          newSortOrder = 2;
        } else {
          newSortOrder = 1;
        }
        break;
      default:
        newSort = 1;
        if (sort === newSort && sortOrder === 1) {
          newSortOrder = 2;
        } else {
          newSortOrder = 1;
        }
        break;
    }

    this.setState({
      sort: newSort,
      sortOrder: newSortOrder,
      page: 0,
      addonList: [],
      searching: true,
    });
    ipcRenderer.invoke('search-for-addons', gameId, gameVersion, searchFilter, selectedCategory, 0, pageSize, newSort, newSortOrder)
      .then((addons) => {
        this.handleAddonSearchResult(addons);
      })
      .catch(() => {
        this.setState({
          searching: false,
          loadingMore: false,
          additionalAddons: false,
        });
      });
  }

  installAddon(addon) {
    const {
      addonVersion,
      currentlyUpdating,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    const newCurrentlyUpdating = currentlyUpdating.slice();
    newCurrentlyUpdating.splice(0, 0, addon.addonId);
    const latestFile = getLatestFile(addon, addonVersion);
    this.setState({
      currentlyUpdating: newCurrentlyUpdating,
    });
    ipcRenderer.invoke('install-addon', gameId, gameVersion, addon, latestFile._id)
      .then((installedAddon) => {
        const {
          erroredUpdates,
          installedAddons,
        } = this.state;
        const currentlyInstalledAddons = installedAddons.map((a) => {
          if (a.addonId !== installedAddon.addonId) {
            return a;
          }
          return installedAddon;
        });
        if (!currentlyInstalledAddons.includes(installedAddon)) {
          currentlyInstalledAddons.splice(0, 0, installedAddon);
        }

        const evenNewerCurrentlyUpdating = newCurrentlyUpdating
          .filter((obj) => obj !== installedAddon.addonId);
        const newErroredUpdates = erroredUpdates.filter((obj) => obj !== installedAddon.addonId);
        this.setState({
          installedAddons: currentlyInstalledAddons,
          currentlyUpdating: evenNewerCurrentlyUpdating,
          erroredUpdates: newErroredUpdates,
        });
      })
      .catch(() => {
        const { erroredUpdates } = this.state;
        erroredUpdates.push(addon.addonId);
        this.setState({
          erroredUpdates,
        });
      });
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
      sort: 1,
      sortOrder: 1,
    });
    ipcRenderer.invoke('search-for-addons', gameId, gameVersion, searchFilter, selectedCategory, page, pageSize, 1, 1)
      .then((addons) => {
        this.handleAddonSearchResult(addons);
      })
      .catch(() => {
        this.setState({
          searching: false,
          loadingMore: false,
          additionalAddons: false,
        });
      });
  }

  loadMoreAddons() {
    const {
      searchFilter,
      selectedCategory,
      page,
      pageSize,
      sort,
      sortOrder,
    } = this.state;
    const {
      gameId,
      gameVersion,
    } = this.props;
    this.setState({
      loadingMore: true,
      page: page + 1,
    });
    ipcRenderer.invoke('search-for-addons', gameId, gameVersion, searchFilter, selectedCategory, page + 1, pageSize, sort, sortOrder)
      .then((addons) => {
        this.handleAddonSearchResult(addons);
      })
      .catch(() => {
        this.setState({
          searching: false,
          loadingMore: false,
          additionalAddons: false,
        });
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
    this.setState({
      addonList: [],
      selectedCategory: category,
      page: 0,
      searching: true,
      sort: 1,
      sortOrder: 1,
    });
    ipcRenderer.invoke('search-for-addons', gameId, gameVersion, searchFilter, searchCategory, 0, pageSize, 1, 1)
      .then((addons) => {
        this.handleAddonSearchResult(addons);
      })
      .catch(() => {
        this.setState({
          searching: false,
          loadingMore: false,
          additionalAddons: false,
        });
      });
  }

  clearSearchFilter() {
    this.setState({
      searchFilter: '',
      sort: 0,
      sortOrder: 0,
      addonList: [],
    }, () => { this.refreshSearch(); });
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
      selectedCategory,
      searchFilter,
      searching,
      sortOrder,
    } = this.state;
    const {
      gameVersion,
      gameId,
    } = this.props;

    const noTableData = () => {
      if (searching) {
        return (<div className="loading"><LoadingSpinner /></div>);
      }
      return (<div className="no-data-label">No Addons Matching Your Filters</div>);
    };

    const selectedCat = categories.filter((category) => (
      parseInt(category.categoryId, 10) === parseInt(selectedCategory, 10)));
    let selectedCategoryName = 'Category';
    if (selectedCat.length > 0) {
      selectedCategoryName = selectedCat[0].name;
    }
    const browseAddonsColumns = [{
      dataField: 'addonName',
      text: 'Addon',
      formatExtraData: gameId,
      sort: true,
      onSort: this.handleSort,
      formatter: (cellContent, row, rowIndex, formatExtraData) => {
        let avatarUrl;
        if (row.avatar) {
          avatarUrl = row.avatar;
        } else if (formatExtraData === 1) {
          avatarUrl = '../img/icons/wow-icon.png';
        } else if (formatExtraData === 2) {
          avatarUrl = '../img/icons/eso-icon.png';
        } else {
          avatarUrl = '../img/app_icon.png';
        }

        return (
          <div className="browse-addon-title-column">
            <img className="addon-table-img" alt="Addon icon" src={avatarUrl} />
            <div className="addon-name-section">
              <div
                className="addon-name"
                role="button"
                tabIndex="0"
                onClick={() => this.handleSelectAddon(row.addonId)}
                onKeyPress={() => this.handleSelectAddon(row.addonId)}
              >
                {cellContent}
              </div>
            </div>
          </div>
        );
      },
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
            installedFileDate = Date.parse(extraData.installedAddons[i].installedFile.fileDate);
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
      sort: true,
      onSort: this.handleSort,
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
      text: 'Updated',
      formatExtraData: addonVersion,
      sort: true,
      onSort: this.handleSort,
      formatter: (cellContent, row, rowIndex, gameV) => {
        let latest = cellContent.find((f) => f.gameVersionFlavor === gameV && f.releaseType === 1);
        if (!latest) {
          latest = cellContent.find((f) => f.gameVersionFlavor === gameV && f.releaseType === 2);
        }
        if (!latest) {
          latest = cellContent.find((f) => f.gameVersionFlavor === gameV && f.releaseType === 3);
        }
        const fileDate = new Date(Date.parse(latest.fileDate));
        const [month, date, year] = fileDate.toLocaleDateString().split('/');
        return (
          `${year}-${month}-${date}`
        );
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
      dataField: 'gameVersion',
      isDummyField: true,
      text: 'Patch',
      formatExtraData: addonVersion,
      formatter: (cellContent, row, rowIndex, addonV) => {
        let latest = row.latestFiles
          .find((f) => f.gameVersionFlavor === addonV && f.releaseType === 1);
        if (!latest) {
          latest = row.latestFiles
            .find((f) => f.gameVersionFlavor === addonV && f.releaseType === 2);
        }
        if (!latest) {
          latest = row.latestFiles
            .find((f) => f.gameVersionFlavor === addonV && f.releaseType === 3);
        }
        return latest.gameVersion[0];
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
                {searchFilter && searchFilter !== ''
                  ? (
                    <div
                      className="search-filter-clear"
                      role="button"
                      tabIndex="0"
                      onClick={this.clearSearchFilter}
                      onKeyPress={this.clearSearchFilter}
                    >
                      <i className="fas fa-times-circle" />
                    </div>
                  )
                  : ''}
                <Form.Group>
                  <Form.Control
                    type="text"
                    name="searchFilter"
                    className="addon-search-field"
                    placeholder="Search"
                    value={searchFilter}
                    onChange={this.changeFilter}
                  />
                </Form.Group>
              </Col>
            </Row>
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
                      noDataIndication={noTableData}
                      sort={{ dataField: 'price', order: sortOrder === 1 ? 'asc' : 'desc', sortFunc: () => {} }}
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
                  {additionalAddons && !loadingMore
                    ? <div className="load-more" role="button" tabIndex="0" onClick={this.loadMoreAddons} onKeyPress={this.loadMoreAddons}>load more</div>
                    : ''}
                </Col>
              </Row>
            </SimpleBar>
          </Col>
        </Row>
      </div>
    );
  }
}

BrowseAddonsWindow.propTypes = {
  gameId: PropTypes.number.isRequired,
  gameVersion: PropTypes.string.isRequired,
  filter: PropTypes.string,
  sort: PropTypes.number.isRequired,
  sortOrder: PropTypes.number.isRequired,
  onSelectAddon: PropTypes.func.isRequired,
};

BrowseAddonsWindow.defaultProps = {
  filter: '',
};

export default BrowseAddonsWindow;
