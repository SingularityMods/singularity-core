import './BackupRestoreDialog.css';

import * as React from 'react';
import { Row, Col, Form, Spinner, Button, ButtonGroup } from 'react-bootstrap';

import BootstrapTable from 'react-bootstrap-table-next';
import SimpleBar from 'simplebar-react';

import { ipcRenderer } from 'electron';

export default class BackupRestoreDialog extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            backup:this.props.backup,
            restoreSettings: false,
            isRestoring: false,
            selectedRows: [],
            restoreError: '',
            restoreMessage: '',
            darkMode: false,
            restoreState: this.props.restoreState,
            backupPending: this.props.backupPending,
            restorePending: this.props.restorePending
        }

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
            darkMode: darkMode
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.backupPending !== prevProps.backupPending || this.props.restorePending !== prevProps.restorePending) {
            this.setState({
                backupPending: this.props.backupPending,
                restorePending: this.props.restorePending
            })
        }
        if (this.props.restoreState !== prevProps.restoreState) {
            this.setState({
                restoreState: this.props.restoreState
            })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('granular-restore-complete', this.restoreListener);
    }

    restoreListener(event, success, error) {
        if (success) {
            this.setState({
                isRestoring: false,
                restoreMessage: 'Succesfully Restored Backup'
            })
        } else {
            this.setState({
                isRestoring: false,
                restoreError: error
            })
        }
        
    }

    onRowSelect(row, isSelected) {
        if (isSelected) {
            this.setState({
                selectedRows: [...this.state.selectedRows, row]
            })
        } else {
            let selected = this.state.selectedRows.filter( obj => {
                return obj.addonId !== row.addonId
            })
            this.setState({
                selectedRows: selected
            })
        }
        
    }

    onSelectAll(isSelect, rows) {
        if (isSelect) {
            this.setState({
                selectedRows: rows
            })
        } else {
            this.setState({
                selectedRows: []
            })
        }
    }

    handleCheckOption(event) {
        if (event.target.id == 'restoreSettings') {
            this.setState({
                restoreSettings: event.target.checked
            })
        } 
    }

    handleRestore() {
        let restoreBackup = {};
        Object.assign(restoreBackup, this.state.backup)
        restoreBackup.addons = this.state.selectedRows;
        this.props.onSubmit(restoreBackup, this.state.restoreSettings);
        /*
        ipcRenderer.send('restore-granular-backup', restoreBackup, this.state.restoreSettings);
        this.setState({
            isRestoring: true,
            restoreMessage: '',
            restoreError: ''
        });*/
    }

    render() {
        const columns = [{
            dataField: 'addonName',
            text: 'Addon'
        }, {
            dataField: 'fileName',
            text: 'File'
        }, {
            dataField: 'fileDate',
            text: 'File Date'
        }, {
            dataField: 'gameVersion',
            text: 'Game Version'
        }];
        const selectRow = {
            mode: 'checkbox',
            clickToSelect: true,
            onSelect: this.onRowSelect,
            onSelectAll: this.onSelectAll
          };
        return (
            <div className="BackupRestoreDialog">
                <div className="restore-backup-dialog-content">
                    <Row>
                        <Col xs={{span:2,offset:10}} className="restore-backup-dialog-exit pull-right">
                            <Button className=" backup-dialog-button restore-back-button" id="close-restore-btn" onClick={this.props.onExit}>Back</Button>
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
                                            <span className='restore-backup-detail-label'>Backup Time: </span>{this.state.backup.formattedTime}
                                        </Col>
                                    </Row>
                                    <Row>{
                                        this.state.backup.cloud
                                        ?   <Col xs={12} className="restore-backup-detail backup-client">
                                            <span className='restore-backup-detail-label'>Backup From: </span>{this.state.backup.installation.hostname}
                                            </Col>
                                        : ''
                                        }
                                    </Row>
                                </Col>
                                <Col xs={6}>
                                    <Row>
                                        <Col xs={12} className="restore-backup-detail backup-type">
                                        <span className='restore-backup-detail-label'>Backup Type: </span>{this.state.backup.cloud ? 'Cloud' : 'Local'}
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col xs={12} className="restore-backup-detail game-version">
                                            <span className='restore-backup-detail-label'>Game Version:</span>
                                                {this.state.backup.gameVersion == 'wow_retail'
                                                    ? ' Retail'
                                                    : this.state.backup.gameVersion == 'wow_classic'
                                                        ? ' Classic'
                                                        : this.state.backup.gameVersion == 'wow_retail_ptr'
                                                            ? ' Retail PTR'
                                                            : this.state.backup.gameVersion == 'wow_classic_ptr'
                                                                ? ' Classic PTR'
                                                                : this.state.backup.gameVersion == 'wow_retail_beta'
                                                                    ? ' Retail Beta'
                                                                    : this.state.backup.gameVersion == 'wow_classic_beta'
                                                                        ? ' Classic Beta'
                                                                        : ''}
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
                                disabled={this.state.backupPending || this.state.restorePending || (!this.state.restoreSettings && this.state.selectedRows.length == 0)}
                                onClick={this.handleRestore}>
                                    Restore
                                </Button>
                        <div className="restore-backup-confirm-option">
                            <Form.Check
                                label="Restore Settings"
                                type="checkbox"
                                id="restoreSettings"
                                disabled={this.state.backup.cloud && this.state.backup.version == 1}
                                checked={this.state.restoreSettings}
                                onChange={this.handleCheckOption} />
                            </div>
                        </Col>
                        <Col xs={7} className="restore-backup-message">
                            {this.state.backupPending
                                ? <div>
                                    <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="restore-pending-spinner">
                                        <span className="sr-only">Backup Pending...</span>
                                    </Spinner>
                                        <span className="pending-message">Backup Pending</span>
                                    </div>
                                : this.state.restorePending
                                    ? <div>
                                        <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="restore-pending-spinner">
                                            <span className="sr-only">Restore Pending...</span>
                                        </Spinner>
                                        <span  className="pending-message">
                                            {this.state.restoreState
                                                ? this.state.restoreState
                                                : 'Restore Pending'
                                                }
                                            </span>
                                        </div>
                                    : this.state.restoreMessage
                                        ? <div className="backup-restore-message restore-success">{this.state.restoreMessage}</div>
                                        : this.state.restoreError
                                            ? <div className="backup-restore-message restore-error">{this.state.restoreError}</div>
                                            : ''}
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12} className="restore-backup-addon-table">
                        <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? "backup-restore-addon-table-scrollbar mac" : "backup-restore-addon-table-scrollbar"} >
                            <BootstrapTable
                                keyField='addonId'
                                data={ this.state.backup.addons }
                                columns={ columns }
                                selectRow={ selectRow }
                                headerClasses='restore-addon-header'
                                rowClasses='restore-addon-row'
                                />
                        </SimpleBar>
                        </Col>
                    </Row>
                </div>
                
            </div>
        )
    }
}