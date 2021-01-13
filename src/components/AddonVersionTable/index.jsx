import './AddonVersionTable.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';

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
      tableData = addon.latestClassicFiles;
    }
    const columns = [{
      dataField: 'fileName',
      text: 'File Name',
    }, {
      dataField: 'fileDate',
      text: 'Date',
    }, {
      dataField: 'gameVersion',
      text: 'Patch',
      formatter: (cellContent) => (cellContent[0]),
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
    return (
      <Row>
        <Col xs={12} className="addon-version-table">
          {addon && addon.gameVersionLatestFiles
            ? (
              <BootstrapTable
                className="addon-version-table"
                keyField="_id"
                data={tableData}
                columns={columns}
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
