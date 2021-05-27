import './AddonVersionTable.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';
import AddonTable from '../AddonTable';

class AddonVersionTable extends React.Component {
  constructor(props) {
    super(props);
    const {
      addon,
      gameVersion,
      installedAddon,
      currentlyInstallingFile,
    } = this.props;
    this.state = {
      addon,
      gameVersion,
      installedAddon,
      currentlyInstallingFile,
    };
  }

  componentDidUpdate(prevProps) {
    const {
      currentlyInstallingFile,
      installedAddon,
    } = this.props;
    if (currentlyInstallingFile !== prevProps.currentlyInstallingFile
        || installedAddon !== prevProps.installedAddon) {
      this.setState({
        currentlyInstallingFile,
        installedAddon,
      });
    }
  }

  render() {
    const {
      addon,
      currentlyInstallingFile,
      gameVersion,
      installedAddon,
    } = this.state;

    const {
      handleInstall,
    } = this.props;
    let tableData;
    if (['wow_retail', 'wow_retail_ptr', 'wow_retail_beta', 'eso'].includes(gameVersion)) {
      tableData = addon.latestRetailFiles;
    } else if (['wow_classic', 'wow_classic_ptr', 'wow_classic_beta'].includes(gameVersion)) {
      tableData = addon.latestTBCFiles;
    } else if (['wow_classic_era'].includes(gameVersion)) {
      tableData = addon.latestClassicFiles;
    }
    const columns = [{
      dataField: 'fileName',
      text: 'File Name',
    }, {
      dataField: 'fileDate',
      text: 'Date',
      formatter: (cellContent) => formatDate(new Date(cellContent)),
    }, {
      dataField: 'gameVersion',
      text: 'Patch',
      formatter: (cell, row) => getLatestVersion(cell,row.gameVersionFlavor),
    }, {
      dataField: 'releaseType',
      text: 'Type',
      formatter: (cellContent) => {
        if (cellContent === 1) {
          return ('Release');
        } if (cellContent === 2) {
          return ('Beta');
        } if (cellContent === 3) {
          return ('Alpha');
        }
        return '';
      },
    }, {
      dataField: 'fileSource',
      text: 'Source',
    }, {
      dataField: '_id',
      isdummyField: true,
      text: 'Action',
      formatExtraData: {
        installedAddon,
        currentlyInstallingFile,
      },
      formatter: (cellContent, row, rowIndex, extraData) => {
        if (extraData.currentlyInstallingFile === row._id) {
          return (
            <span className="label label-danger">Updating...</span>
          );
        } if (extraData.installedAddon && extraData.installedAddon.installedFile
              && extraData.installedAddon.installedFile.fileName === row.fileName
              && extraData.installedAddon.installedFile.gameVersion === row.gameVersion[0]
              && extraData.installedAddon.installedFile.fileDate === row.fileDate) {
          return (
            <UpdateAddonButton handleClick={() => { }} disabled type="Installed" />
          );
        }
        return (
          <UpdateAddonButton handleClick={() => handleInstall(addon, cellContent)} type="Install" />
        );
      },
    }];

    function getLatestVersion(versions, flavor) {
      if (flavor === 'eso' || flavor === 'wow_retail') {
        return versions.sort((a,b) => b-a)[0];
      }
      if (flavor === 'wow_classic') {
        let latest = versions.find((v) => v.split('.')[0] === '1');
        if (!latest) {
          return versions.sort((a,b) => b-a)[0];
        }
        return latest;
      }
      if (flavor === 'wow_burning_crusade') {
        let latest = versions.find((v) => v.split('.')[0] === '2');
        if (!latest) {
          return versions.sort((a,b) => b-a)[0];
        }
        return latest;
      }
    }

    function formatDate(date2) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const date1 = new Date();
      const diff = Math.floor(date1.getTime() - date2.getTime());
      const day = 1000 * 60 * 60 * 24;
      const minute = 1000 * 60;
      const minutes = Math.floor(diff / minute);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(diff / day);
      const months = Math.floor(days / 31);
      const years = Math.floor(months / 12);
      let message = '';
      if (years > 0 || months > 0) {
        message = `${monthNames[date2.getMonth()]} ${date2.getDate()}, ${date2.getFullYear()}`;
      } else if (days > 0) {
        message += days;
        if (days > 1) {
          message += ' days ago';
        } else {
          message += ' day ago';
        }
      } else if (hours > 0) {
        message += hours;
        if (hours > 1) {
          message += ' hours ago';
        } else {
          message += ' hour ago';
        }
      } else if (minutes > 0) {
        message += minutes;
        if (minutes > 1) {
          message += ' minutes ago';
        } else {
          message += ' minute ago';
        }
      }
      return message;
    }

    const noTableData = () => (
      <div className="no-data-label">This game version has no files yet</div>);
    return (
      <Row>
        <Col xs={12} className="addon-version-table">
          {addon && addon.latestFiles
            ? (
              <AddonTable
                addons={tableData}
                columns={columns}
                keyField="_id"
                noTableData={noTableData}
              />
            )
            : ''}
        </Col>
      </Row>
    );
  }
}

AddonVersionTable.propTypes = {
  addon: PropTypes.object.isRequired,
  currentlyInstallingFile: PropTypes.string.isRequired,
  gameVersion: PropTypes.string.isRequired,
  installedAddon: PropTypes.object,
  handleInstall: PropTypes.func.isRequired,
};

AddonVersionTable.defaultProps = {
  installedAddon: null,
};

export default AddonVersionTable;
