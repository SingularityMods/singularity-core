import './ClusterAddonTable.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import BootstrapTable from 'react-bootstrap-table-next';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';

function getLatestFile(addon, addonVersion) {
  const possibleFiles = addon.latestFiles.filter((file) => (
    file.gameVersionFlavor === addonVersion
  ));
  if (possibleFiles && possibleFiles.length > 0) {
    return possibleFiles.reduce((a, b) => ((a.releaseType < b.releaseType) ? a : b));
  }
  return null;
}

function ClusterAddonTable(props) {
  const {
    addons,
    installedAddons,
    gameId,
    gameVersion,
    addonVersion,
    keyField,
    handleSelectAddon,
    installAddon,
  } = props;
  const noTableData = () => (<div className="no-data-label">This cluster has no addons</div>);

  const columns = [{
    dataField: 'name',
    text: 'Addon',
    formatExtraData: gameId,
    formatter: (cellContent, row, rowIndex, formatExtraData) => {
      let avatarUrl;
      if (row.avatar) {
        avatarUrl = row.avatar;
      } else if (formatExtraData === 1) {
        avatarUrl = '../img/icons/wow-icon.png';
      } else if (formatExtraData === 2) {
        avatarUrl = '../img/icons/eso-icon.png';
      } else {
        avatarUrl = '../img/app_icon_light.png';
      }

      return (
        <div className="cluster-addon-title-column">
          <img className="cluster-addon-table-img" alt="Addon icon" src={avatarUrl} />
          <div className="cluster-addon-name-section">
            <div
              className="cluster-addon-name"
              role="button"
              tabIndex="0"
              onClick={() => handleSelectAddon(row._id)}
              onKeyPress={() => handleSelectAddon(row._id)}
            >
              {cellContent}
            </div>
          </div>
        </div>
      );
    },
  }, {
    dataField: '_id',
    text: 'Action',
    formatExtraData: {
      installedAddons,
      gameVersion,
    },
    formatter: (cellContent, row, rowIndex, extraData) => {
      let installed = false;
      extraData.installedAddons.forEach((addon) => {
        if (addon.addonId === row._id) {
          installed = true;
        }
      });
      if (installed) {
        return (<span className="label label-danger">Installed</span>);
      }
      return (
        <UpdateAddonButton handleClick={installAddon} clickData={row} type="Install" />
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
    text: 'Updated',
    formatExtraData: gameVersion,
    formatter: (cellContent, row, rowIndex, gameV) => {
      const latest = getLatestFile(row, gameV);
      if (latest) {
        const fileDate = new Date(Date.parse(latest.fileDate));
        const [month, date, year] = fileDate.toLocaleDateString().split('/');
        return (
          `${year}-${month}-${date}`
        );
      }
      return '';
    },
  }, {
    dataField: 'primaryCategory',
    text: 'Category',
    formatter: (cellContent) => (cellContent.name),
  }, {
    dataField: 'gameVersion',
    isDummyField: true,
    text: 'Patch',
    formatExtraData: addonVersion,
    formatter: (cellContent, row, rowIndex, gameV) => {
      const latest = getLatestFile(row, gameV);
      if (latest) {
        return latest.gameVersion[0];
      }
      return '';
    },
  }, {
    dataField: 'author',
    text: 'Author',
  }];
  return (
    <div id="ClusterAddonTable">
      <BootstrapTable
        keyField={keyField}
        headerClasses="cluster-addons-header"
        data={addons}
        columns={columns}
        noDataIndication={noTableData}
        sort={{ dataField: 'name', order: 'asc' }}
      />
    </div>
  );
}

ClusterAddonTable.propTypes = {
  addons: PropTypes.array.isRequired,
  installedAddons: PropTypes.array.isRequired,
  gameVersion: PropTypes.string.isRequired,
  addonVersion: PropTypes.string.isRequired,
  gameId: PropTypes.number.isRequired,
  keyField: PropTypes.string.isRequired,
  handleSelectAddon: PropTypes.func.isRequired,
  installAddon: PropTypes.func.isRequired,
};

export default ClusterAddonTable;
