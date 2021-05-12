import './BackupManagementDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Spinner, Button,
} from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Switch from 'react-switch';
import BootstrapTable from 'react-bootstrap-table-next';
import SimpleBar from 'simplebar-react';

import { ipcRenderer } from 'electron';

class BackupManagementDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      backups: [],
      cloudBackups: [],
      cloud: false,
      profile: {},
      darkMode: false,
      deletePending: false,
      searchingForLocalBackups: false,
      searchingForCloudBackups: false,
    };

    this.localBackupsFoundListener = this.localBackupsFoundListener.bind(this);
    this.cloudBackupsFoundListener = this.cloudBackupsFoundListener.bind(this);
    this.backupCompleteListener = this.backupCompleteListener.bind(this);
    this.backupDeletedListener = this.backupDeletedListener.bind(this);
    this.toggleCloud = this.toggleCloud.bind(this);
    this.handleBackup = this.handleBackup.bind(this);
    this.loadBackupDetails = this.loadBackupDetails.bind(this);
    this.deleteBackup = this.deleteBackup.bind(this);
  }

  componentDidMount() {
    const {
      opts,
    } = this.props;
    ipcRenderer.on('granular-backup-complete', this.backupCompleteListener);
    ipcRenderer.on('local-backups-found', this.localBackupsFoundListener);
    ipcRenderer.on('cloud-backups-found', this.cloudBackupsFoundListener);
    ipcRenderer.on('delete-backup-complete', this.backupDeletedListener);
    ipcRenderer.send('get-local-backups', opts.gameId, opts.gameVersion);
    ipcRenderer.send('get-cloud-backups', opts.gameId, opts.gameVersion);
    const profile = ipcRenderer.sendSync('get-profile');
    const darkMode = ipcRenderer.sendSync('is-dark-mode');
    this.setState({
      profile,
      darkMode,
      searchingForCloudBackups: true,
      searchingForLocalBackups: true,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      latestCloudBackup,
      opts,
    } = this.props;
    if (latestCloudBackup !== prevProps.latestCloudBackup) {
      ipcRenderer.send('get-cloud-backups', opts.gameId, opts.gameVersion);
      ipcRenderer.send('get-local-backups', opts.gameId, opts.gameVersion);
      this.setState({
        searchingForLocalBackups: true,
        searchingForCloudBackups: true,
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('granular-backup-complete', this.backupCompleteListener);
    ipcRenderer.removeListener('local-backups-found', this.localBackupsFoundListener);
    ipcRenderer.removeListener('cloud-backups-found', this.cloudBackupsFoundListener);
    ipcRenderer.removeListener('delete-backup-complete', this.backupDeletedListener);
  }

  handleBackup() {
    const { cloud } = this.state;
    const { onSubmit } = this.props;
    onSubmit(cloud);
    this.setState({
      backupError: null,
    });
  }

  toggleCloud(checked) {
    this.setState({
      cloud: checked,
    });
  }

  loadBackupDetails(backup) {
    const { onOpenBackup } = this.props;
    onOpenBackup(backup);
  }

  deleteBackup(backup) {
    ipcRenderer.send('delete-granular-backup', backup);
    this.setState({
      deletePending: true,
    });
  }

  backupDeletedListener() {
    const {
      opts,
    } = this.props;
    ipcRenderer.send('get-local-backups', opts.gameId, opts.gameVersion);
    ipcRenderer.send('get-cloud-backups', opts.gameId, opts.gameVersion);
    this.setState({
      restoreMessage: '',
      searchingForLocalBackups: true,
      searchingForCloudBackups: true,
      deletePending: false,
    });
  }

  backupCompleteListener(event, success, type, eventGameId, eventGameVersion, errMsg) {
    const { opts } = this.props;
    if (eventGameId === opts.gameId && eventGameVersion === opts.gameVersion) {
      if (success) {
        ipcRenderer.send('get-local-backups', opts.gameId, opts.gameVersion);
        ipcRenderer.send('get-cloud-backups', opts.gameId, opts.gameVersion);
        this.setState({
          restoreMessage: '',
          searchingForLocalBackups: true,
          searchingForCloudBackups: true,
        });
      } else {
        this.setState({
          backupError: errMsg || 'Backup Failed',
        });
      }
    }
  }

  localBackupsFoundListener(_event, success, gameId, gameVersion, backups) {
    const { opts } = this.props;
    if (gameId === opts.gameId && gameVersion === opts.gameVersion) {
      if (success) {
        this.setState({
          backups,
          searchingForLocalBackups: false,
        });
      } else {
        this.setState({
          searchingForLocalBackups: false,
        });
      }
    }
  }

  cloudBackupsFoundListener(event, success, gameId, gameVersion, backups) {
    const { opts } = this.props;
    if (opts.gameId === gameId && opts.gameVersion === gameVersion) {
      if (success) {
        this.setState({
          cloudBackups: [backups],
          searchingForCloudBackups: false,
        });
      } else {
        this.setState({
          cloudBackups: [],
          searchingForCloudBackups: false,
        });
      }
    }
  }

  render() {
    const {
      backups,
      cloud,
      cloudBackups,
      darkMode,
      deletePending,
      profile,
      backupError,
      restoreMessage,
      searchingForLocalBackups,
      searchingForCloudBackups,
    } = this.state;
    const {
      onExit,
      backupState,
      backupPending,
      restorePending,
    } = this.props;
    const formatBytes = (a, b = 2) => { if (a === 0) return '0 Bytes'; const c = b < 0 ? 0 : b; const d = Math.floor(Math.log(a) / Math.log(1024)); return `${parseFloat((a / (1024 ** d)).toFixed(c))} ${['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'][d]}`; };
    let tableData = [];
    backups.forEach((backup) => {
      const tmpBackup = {};
      Object.assign(tmpBackup, backup);
      tmpBackup.cloud = false;
      const tmpTime = new Date(backup.time);
      const time = `${tmpTime.getFullYear()}-${tmpTime.getMonth() + 1}-${tmpTime.getDate()} ${tmpTime.getHours()}:${tmpTime.getMinutes()}:${tmpTime.getSeconds()}`;
      tmpBackup.formattedTime = time;
      tmpBackup.time = tmpTime;
      tmpBackup.keyField = `${backup.backupUUID}-local`;

      tableData.push(tmpBackup);
    });

    cloudBackups.forEach((backup) => {
      const tmpBackup = {};
      Object.assign(tmpBackup, backup);
      tmpBackup.cloud = true;
      const tmpTime = new Date(backup.time);
      const time = `${tmpTime.getFullYear()}-${tmpTime.getMonth() + 1}-${tmpTime.getDate()} ${tmpTime.getHours()}:${tmpTime.getMinutes()}:${tmpTime.getSeconds()}`;
      tmpBackup.formattedTime = time;
      tmpBackup.time = tmpTime;
      tmpBackup.keyField = `${backup.backupUUID}-cloud`;

      tableData.push(tmpBackup);
    });
    function getGameVersionName(gameVersion) {
      switch (gameVersion) {
        case 'wow_retail':
          return 'Retail';
        case 'wow_classic':
          return 'Classic';
        case 'wow_retail_ptr':
          return 'Retail PTR';
        case 'wow_classic_ptr':
          return 'Classic PTR';
        case 'wow_retail_beta':
          return 'Retail Beta';
        case 'wow_classic_beta':
          return 'Classic Beta';
        case 'eso':
          return 'Elder Scrolls Online';
        default:
          return '';
      }
    }

    function getMessage() {
      if (searchingForCloudBackups || searchingForLocalBackups) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="search-pending-spinner">
              <span className="sr-only">Search Pending...</span>
            </Spinner>
            <span className="pending-message cloud-search-message">
              Searching For Backups
            </span>
          </div>
        );
      }
      if (deletePending) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="delete-pending-spinner">
              <span className="sr-only">Delete Pending...</span>
            </Spinner>
            <span className="pending-message cloud-search-message">Deleting Backup...</span>
          </div>
        );
      } if (backupPending) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="restore-pending-spinner">
              <span className="sr-only">Backup Pending...</span>
            </Spinner>
            <span className="pending-message">
              {backupState || 'Backup Pending'}
            </span>
          </div>
        );
      }
      if (restorePending) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="restore-pending-spinner">
              <span className="sr-only">Restore Pending...</span>
            </Spinner>
            <span className="pending-message">Restore Pending</span>
          </div>
        );
      }
      if (restoreMessage) {
        return <div className="backup-message restore-success">{restoreMessage}</div>;
      }

      if (backupError) {
        return <div className="backup-message restore-error">{backupError}</div>;
      }
      return '';
    }

    tableData = tableData.sort((a, b) => b.time - a.time);
    const noTableData = () => (
      <div className="no-data-label">No backups!</div>);
    const columns = [{
      dataField: 'cloud',
      align: 'center',
      headerAlign: 'center',
      text: 'Location',
      formatter: (_cellContent, row) => (
        <div className="backup-addon-cloud-column">
          {row.cloud
            ? <div><i className="fas fa-cloud backup-location-icon" /></div>
            : <div><i className="fas fa-desktop backup-location-icon" /></div>}
        </div>
      ),
    }, {
      dataField: 'formattedTime',
      align: 'center',
      headerAlign: 'center',
      text: 'Time',
    }, {
      dataField: 'gameVersion',
      align: 'center',
      headerAlign: 'center',
      text: 'Game Version',
      formatter: (cellContent, row) => (
        <div className="backup-addon-version-column">
          {getGameVersionName(row.gameVersion)}
        </div>
      ),
    }, {
      dataField: 'size',
      align: 'center',
      headerAlign: 'center',
      text: 'Size',
      formatter: (cellContent) => {
        if (!cellContent) {
          return (
            <div className="backup-size-column">Unknown</div>
          );
        }
        return (
          <div className="backup-size-column">{formatBytes(cellContent)}</div>
        );
      },
    }, {
      dataField: 'details',
      align: 'center',
      headerAlign: 'center',
      text: 'Details',
      dummyField: true,
      formatter: (_cellContent, row) => (
        <div role="button" tabIndex="0" className="backup-addon-details-column details-button" onClick={() => this.loadBackupDetails(row)} onKeyPress={() => this.deleteBackup(row)}>
          Details
        </div>
      ),
    }, {
      dataField: 'delete',
      align: 'center',
      headerAlign: 'center',
      text: 'Delete',
      dummyField: true,
      formatter: (_cellContent, row) => (
        <div role="button" tabIndex="0" className="backup-addon-details-column delete-button" onClick={() => this.deleteBackup(row)} onKeyPress={() => this.deleteBackup(row)}>
          <i className="fas fa-times" />
        </div>
      ),
    },
    ];
    return (
      <div className="BackupManagementDialog">
        <div className="backup-management-dialog-content">
          <Row>
            <Col xs={{ span: 2, offset: 10 }} className="backup-management-dialog-exit pull-right">
              <Button className=" backup-dialog-button restore-back-button" id="close-restore-btn" onClick={onExit}>Exit</Button>
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="backup-management-dialog-title">
              <h2>Current Backups</h2>
            </Col>
          </Row>
          <Row>
            <Col xs={6} className="backup-management-confirm">
              <Button
                className="backup-dialog-button"
                disabled={backupPending || restorePending}
                onClick={this.handleBackup}
              >
                Create Backup
              </Button>
              <div className="backup-management-confirm-option">
                <div className="cloud-backup-toggle" data-tip data-for="cloudToggleTooltip" data-tip-disable={profile && profile.emailVerified}>
                  <Switch
                    id="backupCloud"
                    disabled={!profile || !profile.emailVerified}
                    onChange={this.toggleCloud}
                    checked={cloud}
                    className="settings-switch"
                    onColor="#00cc00"
                    height={20}
                    width={40}
                    activeBoxShadow="0 0 2px 3px #00cc00"
                  />
                </div>
                <ReactTooltip id="cloudToggleTooltip">
                  {!profile
                    ? (
                      <span>
                        You must be logged in to a Singularity
                        account to use this feature.
                      </span>
                    )
                    : ''}
                  {profile && !profile.emailVerified
                    ? (
                      <span>
                        You need to verify your email before
                        you can use this feature.
                      </span>
                    )
                    : ''}
                </ReactTooltip>
                <div className="backup-management-cloud-label">
                  Cloud Backup
                </div>
                <div data-tip data-for="backupCloudTooltip" className="cloud-backup-tooltip">
                  <i className="fas fa-question-circle option-tooltip menu-icon" />
                </div>
                <ReactTooltip id="backupCloudTooltip">
                  <span>
                    This backs up the WTF directory and your installed addons
                    to Singularity&apos;s servers.
                  </span>
                </ReactTooltip>
              </div>
            </Col>
            <Col xs={6} className="backup-management-message">
              {getMessage()}
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="backup-management-addon-table">
              <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? 'backup-management-addon-table-scrollbar mac' : 'backup-management-addon-table-scrollbar'}>
                <BootstrapTable
                  id="backup-management-table"
                  keyField="keyField"
                  data={tableData}
                  columns={columns}
                  headerClasses="restore-addon-header"
                  rowClasses="restore-addon-row"
                  noDataIndication={noTableData}
                />
              </SimpleBar>
            </Col>
          </Row>
        </div>

      </div>
    );
  }
}

BackupManagementDialog.propTypes = {
  backupPending: PropTypes.bool.isRequired,
  backupState: PropTypes.string,
  latestCloudBackup: PropTypes.object,
  onExit: PropTypes.func.isRequired,
  onOpenBackup: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  opts: PropTypes.object.isRequired,
  restorePending: PropTypes.bool.isRequired,
};

BackupManagementDialog.defaultProps = {
  backupState: null,
  latestCloudBackup: null,
};

export default BackupManagementDialog;
