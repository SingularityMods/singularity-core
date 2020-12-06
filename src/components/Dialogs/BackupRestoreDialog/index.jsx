import './BackupRestoreDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Form, Spinner, Button,
} from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import SimpleBar from 'simplebar-react';

import { ipcRenderer } from 'electron';

class BackupRestoreDialog extends React.Component {
  constructor(props) {
    super(props);
    const {
      backup,
      backupPending,
      restorePending,
      restoreState,
    } = this.props;
    this.state = {
      backup,
      restoreSettings: false,
      selectedRows: [],
      restoreError: '',
      restoreMessage: '',
      darkMode: false,
      restoreState,
      backupPending,
      restorePending,
    };

    this.restoreListener = this.restoreListener.bind(this);
    this.handleCheckOption = this.handleCheckOption.bind(this);
    this.handleRestore = this.handleRestore.bind(this);
    this.onRowSelect = this.onRowSelect.bind(this);
    this.onSelectAll = this.onSelectAll.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('granular-restore-complete', this.restoreListener);
    const darkMode = ipcRenderer.sendSync('is-dark-mode');
    this.setState({
      darkMode,
    });
  }

  componentDidUpdate(prevProps) {
    const {
      backupPending,
      restorePending,
      restoreState,
    } = this.props;
    if (backupPending !== prevProps.backupPending || restorePending !== prevProps.restorePending) {
      this.setState({
        backupPending,
        restorePending,
      });
    }
    if (restoreState !== prevProps.restoreState) {
      this.setState({
        restoreState,
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('granular-restore-complete', this.restoreListener);
  }

  handleCheckOption(event) {
    if (event.target.id === 'restoreSettings') {
      this.setState({
        restoreSettings: event.target.checked,
      });
    }
  }

  handleRestore() {
    const {
      backup,
      restoreSettings,
      selectedRows,
    } = this.state;
    const {
      onSubmit,
    } = this.props;
    const restoreBackup = {};
    Object.assign(restoreBackup, backup);
    restoreBackup.addons = selectedRows;
    onSubmit(restoreBackup, restoreSettings);
  }

  onRowSelect(row, isSelected) {
    const {
      selectedRows,
    } = this.state;
    if (isSelected) {
      this.setState({
        selectedRows: [...selectedRows, row],
      });
    } else {
      const selected = selectedRows.filter((obj) => obj.addonId !== row.addonId);
      this.setState({
        selectedRows: selected,
      });
    }
  }

  onSelectAll(isSelect, rows) {
    if (isSelect) {
      this.setState({
        selectedRows: rows,
      });
    } else {
      this.setState({
        selectedRows: [],
      });
    }
  }

  restoreListener(event, success, error) {
    if (success) {
      this.setState({
        restoreMessage: 'Succesfully Restored Backup',
      });
    } else {
      this.setState({
        restoreError: error,
      });
    }
  }

  render() {
    const {
      backup,
      onExit,
    } = this.props;
    const {
      backupPending,
      darkMode,
      restoreError,
      restoreMessage,
      restorePending,
      restoreSettings,
      restoreState,
      selectedRows,
    } = this.state;
    const columns = [{
      dataField: 'addonName',
      text: 'Addon',
    }, {
      dataField: 'fileName',
      text: 'File',
    }, {
      dataField: 'fileDate',
      text: 'File Date',
    }, {
      dataField: 'gameVersion',
      text: 'Game Version',
    }];
    const selectRow = {
      mode: 'checkbox',
      clickToSelect: true,
      onSelect: this.onRowSelect,
      onSelectAll: this.onSelectAll,
    };
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
        default:
          return '';
      }
    }
    function getMessage() {
      if (backupPending) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="restore-pending-spinner">
              <span className="sr-only">Backup Pending...</span>
            </Spinner>
            <span className="pending-message">Backup Pending</span>
          </div>
        );
      }
      if (restorePending) {
        return (
          <div>
            <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="restore-pending-spinner" id="restore-pending-spinner">
              <span className="sr-only">Restore Pending...</span>
            </Spinner>
            <span className="pending-message">
              {restoreState || 'Restore Pending'}
            </span>
          </div>
        );
      }
      if (restoreMessage) {
        return <div className="backup-restore-message restore-success">{restoreMessage}</div>;
      }
      if (restoreError) {
        return <div className="backup-restore-message restore-error">{restoreError}</div>;
      }
      return '';
    }
    return (
      <div className="BackupRestoreDialog">
        <div className="restore-backup-dialog-content">
          <Row>
            <Col xs={{ span: 2, offset: 10 }} className="restore-backup-dialog-exit pull-right">
              <Button className=" backup-dialog-button restore-back-button" id="close-restore-btn" onClick={onExit}>Back</Button>
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="restore-backup-dialog-title">
              <h2>Restore Backup</h2>
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="restore-backup-dialog-details">
              <Row>
                <Col xs={6}>
                  <Row>
                    <Col xs={12} className="restore-backup-detail backup-date">
                      <span className="restore-backup-detail-label">Backup Time: </span>
                      {backup.formattedTime}
                    </Col>
                  </Row>
                  <Row>
                    {backup.cloud
                      ? (
                        <Col xs={12} className="restore-backup-detail backup-client">
                          <span className="restore-backup-detail-label">Backup From: </span>
                          {backup.installation.hostname}
                        </Col>
                      )
                      : ''}
                  </Row>
                </Col>
                <Col xs={6}>
                  <Row>
                    <Col xs={12} className="restore-backup-detail backup-type">
                      <span className="restore-backup-detail-label">Backup Type: </span>
                      {backup.cloud ? 'Cloud' : 'Local'}
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12} className="restore-backup-detail game-version">
                      <span className="restore-backup-detail-label">Game Version:</span>
                      {getGameVersionName(backup.gameVersion)}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Col>
          </Row>
          <Row>
            <Col xs={5} className="restore-backup-confirm">
              <Button
                className="backup-dialog-button"
                disabled={backupPending
                  || restorePending
                  || (!restoreSettings && selectedRows.length === 0)}
                onClick={this.handleRestore}
              >
                Restore
              </Button>
              <div className="restore-backup-confirm-option">
                <Form.Check
                  label="Restore Settings"
                  type="checkbox"
                  id="restoreSettings"
                  disabled={backup.cloud && backup.version === 1}
                  checked={restoreSettings}
                  onChange={this.handleCheckOption}
                />
              </div>
            </Col>
            <Col xs={7} className="restore-backup-message">
              {getMessage()}
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="restore-backup-addon-table">
              <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? 'backup-restore-addon-table-scrollbar mac' : 'backup-restore-addon-table-scrollbar'}>
                <BootstrapTable
                  keyField="addonId"
                  data={backup.addons}
                  columns={columns}
                  selectRow={selectRow}
                  headerClasses="restore-addon-header"
                  rowClasses="restore-addon-row"
                />
              </SimpleBar>
            </Col>
          </Row>
        </div>

      </div>
    );
  }
}

BackupRestoreDialog.propTypes = {
  backup: PropTypes.object.isRequired,
  backupPending: PropTypes.bool.isRequired,
  onExit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
  restoreState: PropTypes.string,
};

BackupRestoreDialog.defaultProps = {
  restoreState: null,
};

export default BackupRestoreDialog;
