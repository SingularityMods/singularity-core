import './BackupManagementDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Spinner, Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Switch from "react-switch";
import BootstrapTable from 'react-bootstrap-table-next';
import SimpleBar from 'simplebar-react';

import { ipcRenderer } from 'electron';

class BackupManagementDialog extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            backups: [],
            cloudBackups: [],
            gameId: this.props.opts.gameId,
            gameVersion: this.props.opts.gameVersion,
            cloud: false,
            profile: {},
            backupError: '',
            backupMessage: '',
            darkMode: false,
            backupPending: this.props.backupPending,
            restorePending: this.props.restorePending,
            backupState: this.props.backupState,
            deletePending: false,
            searchingForLocalBackups: false,
            searchingForCloudBackups: false
        }

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
        ipcRenderer.on('granular-backup-complete', this.backupCompleteListener);
        ipcRenderer.on('local-backups-found', this.localBackupsFoundListener);
        ipcRenderer.on('cloud-backups-found', this.cloudBackupsFoundListener);
        ipcRenderer.on('delete-backup-complete', this.backupDeletedListener);
        ipcRenderer.send('get-local-backups', this.state.gameId, this.state.gameVersion);
        ipcRenderer.send('get-cloud-backups', this.state.gameId, this.state.gameVersion);
        let profile = ipcRenderer.sendSync('get-profile');
        const darkMode = ipcRenderer.sendSync('is-dark-mode');
        this.setState({
            profile: profile,
            darkMode: darkMode,
            searchingForCloudBackups: true,
            searchingForLocalBackups: true,
        });
    }

    componentDidUpdate(prevProps) {
        if (this.props.latestCloudBackup !== prevProps.latestCloudBackup) {
            ipcRenderer.send('get-cloud-backups', this.state.gameId, this.state.gameVersion);
            ipcRenderer.send('get-local-backups', this.state.gameId, this.state.gameVersion);
            this.setState({
                searchingForLocalBackups: true,
                searchingForCloudBackups: true
            })
        }
        if (this.props.backupPending !== prevProps.backupPending || this.props.restorePending !== prevProps.restorePending) {
            this.setState({
                backupPending: this.props.backupPending,
                restorePending: this.props.restorePending
            })
        }
        if (this.props.backupState !== prevProps.backupState) {
            this.setState({
                backupState: this.props.backupState
            })
        }
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('granular-backup-complete', this.backupCompleteListener);
        ipcRenderer.removeListener('local-backups-found', this.localBackupsFoundListener);
        ipcRenderer.removeListener('cloud-backups-found', this.cloudBackupsFoundListener);
        ipcRenderer.removeListener('delete-backup-complete', this.backupDeletedListener);
    }

    backupDeletedListener(event, success, error) {
        ipcRenderer.send('get-local-backups', this.state.gameId, this.state.gameVersion);
        ipcRenderer.send('get-cloud-backups', this.state.gameId, this.state.gameVersion);
        this.setState({
            restoreMessage: '',
            searchingForLocalBackups: true,
            searchingForCloudBackups: true,
            deletePending: false
        })
    }

    backupCompleteListener(event, success, type, gameId, gameVersion ,error) {
        if (success) {
            ipcRenderer.send('get-local-backups', this.state.gameId, this.state.gameVersion);
            ipcRenderer.send('get-cloud-backups', this.state.gameId, this.state.gameVersion);
            this.setState({
                restoreMessage: '',
                searchingForLocalBackups: true,
                searchingForCloudBackups: true
            })
        } else {
            this.setState({
                restoreError: 'Backup Failed'
            })
        } 
    }

    localBackupsFoundListener(event,success, gameId, gameVersion, backups, error) {
        if (gameId == this.state.gameId && gameVersion == this.state.gameVersion) {
            if (success){
                this.setState({
                    backups: backups,
                    searchingForLocalBackups: false
                })
            } else {
                this.setState({
                    backupError: error,
                    searchingForLocalBackups: false
                })
            }
        }
   
    }

    cloudBackupsFoundListener(event, success, gameId, gameVersion, backups, err) {
        if (this.state.gameId == gameId && this.state.gameVersion == gameVersion) {
            if (success) {
                this.setState({
                    cloudBackups: [backups,],
                    searchingForCloudBackups: false
                })
            } else {
                this.setState({
                    cloudBackups: [],
                    searchingForCloudBackups: false
                })
            }
        }
        
    }

    toggleCloud(checked) {
        this.setState({
            cloud: checked
        });
    }

    handleBackup() {
        this.props.onSubmit(this.state.cloud);
    }

    loadBackupDetails(backup) {
        this.props.onOpenBackup(backup);
    }

    deleteBackup(backup) {
        ipcRenderer.send('delete-granular-backup', backup);
        this.setState({
            deletePending: true
        })
    }

    render() {
        const formatBytes = (a,b=2) => {if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}
        let tableData = [];
        this.state.backups.forEach(backup => {
            let tmpBackup = {};
            Object.assign(tmpBackup, backup) 
            tmpBackup.cloud = false;
            let tmpTime = new Date(backup.time)
            let time = tmpTime.getFullYear() + '-' + (tmpTime.getMonth()+1) + '-' + tmpTime.getDate() + ' ' + tmpTime.getHours() + ':' + tmpTime.getMinutes() + ':' + tmpTime.getSeconds();
            tmpBackup.formattedTime = time;
            tmpBackup.time = tmpTime;
            tmpBackup.keyField = backup.backupUUID+'-local'

            tableData.push(tmpBackup);
        })

        this.state.cloudBackups.forEach(backup => {
            let tmpBackup = {};
            Object.assign(tmpBackup, backup) 
            tmpBackup.cloud = true;
            let tmpTime = new Date(backup.time)
            let time = tmpTime.getFullYear() + '-' + (tmpTime.getMonth()+1) + '-' + tmpTime.getDate() + ' ' + tmpTime.getHours() + ':' + tmpTime.getMinutes() + ':' + tmpTime.getSeconds();
            tmpBackup.formattedTime = time;
            tmpBackup.time = tmpTime;
            tmpBackup.keyField = backup.backupUUID+'-cloud'

            tableData.push(tmpBackup);

        })


        tableData = tableData.sort((a,b) => b.time - a.time)
        const noTableData = () => {
            return(
            <div className="no-data-label">No backups!</div>)
        }
        const columns = [{
            dataField: 'cloud',
            align: 'center',
            headerAlign: 'center',
            text: 'Location',
            formatter: (cellContent, row, rowIndex) => {
                return (
                    <div className="backup-addon-cloud-column">
                        {row.cloud
                            ? <div><i className="fas fa-cloud backup-location-icon"></i></div>
                            :<div><i className="fas fa-desktop backup-location-icon"></i></div>
                        }
                    </div>
                );
            }       
        }, {
            dataField: 'formattedTime',
            align: 'center',
            headerAlign: 'center',
            text: 'Time'
        }, {
            dataField: 'gameVersion',
            align: 'center',
            headerAlign: 'center',
            text: 'Game Version',
            formatter: (cellContent, row, rowIndex) => {
                return (
                    <div className="backup-addon-version-column">
                        {row.gameVersion == 'wow_retail'
                            ? 'Retail'
                            : row.gameVersion == 'wow_classic'
                                ? 'Classic'
                                : row.gameVersion == 'wow_retail_ptr'
                                    ? 'Retail PTR'
                                    : row.gameVersion == 'wow_classic_ptr'
                                        ? 'Classic PTR'
                                        : row.gameVersion == 'wow_retail_beta'
                                            ? 'Retail Beta'
                                            : row.gameVersion == 'wow_classic_beta'
                                                ? 'Clssic Beta'
                                                : ''
                        }
                    </div>
                );
            }   
        }, {
            dataField: 'size',
            align: 'center',
            headerAlign: 'center',
            text: 'Size',
            formatter: (cellContent, row, rowIndex) => {
                if (!cellContent) {
                    return (
                        <div className="backup-size-column">Unknown</div>
                    )
                } else {
                    return (
                        <div className="backup-size-column">{formatBytes(cellContent)}</div>
                    )
                }
            }
        }, {
            dataField: 'details',
            align: 'center',
            headerAlign: 'center',
            text: 'Details',
            dummyField: true,
            formatter: (cellContent, row, rowIndex) => {
                return (
                    <div className="backup-addon-details-column" onClick={() => this.loadBackupDetails(row)}>
                        Details
                    </div>
                )
            }
        }, {
            dataField: 'delete',
            align: 'center',
            headerAlign: 'center',
            text: 'Delete',
            dummyField: true,
            formatter: (cellContent, row, rowIndex) => {
                return (
                    <div className="backup-addon-details-column delete-backup" onClick={() => this.deleteBackup(row)}>
                        <i className="fas fa-times"></i>
                    </div>
                )
            }
        },
        ];
        return (
            <div className="BackupManagementDialog">
                <div className="backup-management-dialog-content">
                    <Row>
                        <Col xs={{span:2,offset:10}} className="backup-management-dialog-exit pull-right">
                        <Button className=" backup-dialog-button restore-back-button" id="close-restore-btn" onClick={this.props.onExit}>Exit</Button>
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
                                disabled={this.state.backupPending || this.state.restorePending}
                                onClick={this.handleBackup}>
                                    Create Backup
                                </Button>
                            <div className="backup-management-confirm-option">
                                <a data-tip data-for="cloudToggleTooltip" data-tip-disable={this.state.profile && this.state.profile.emailVerified}>
                                <Switch
                                    id="backupCloud"
                                    disabled={!this.state.profile || !this.state.profile.emailVerified}
                                    onChange={this.toggleCloud}
                                    checked={this.state.cloud}
                                    className="settings-switch"
                                    onColor="#ED8323"
                                    height={20}
                                    width={40}
                                    activeBoxShadow="0 0 2px 3px #ED8323" />
                                </a>
                                <ReactTooltip id="cloudToggleTooltip">
                                    {!this.state.profile
                                        ? <span>You must be logged in to a Singularity account to use this feature.</span>
                                        : !this.state.profile.emailVerified
                                            ? <span>You need to verify your email before you can use this feature.</span>
                                            : ''
                                    }

                                </ReactTooltip>
                                <label className="backup-management-cloud-label">
                                        <span>Cloud Backup</span>
                                    </label>
                                <a data-tip data-for="backupCloudTooltip">
                                    <i className="fas fa-question-circle option-tooltip menu-icon"></i>
                                </a>
                                <ReactTooltip id="backupCloudTooltip">
                                    <span>This backs up the WTF directory and your installed addons to Singularity&apos;s servers.</span>
                                </ReactTooltip>
                            </div>
                        </Col>
                        <Col xs={6} className="backup-management-message">
                            {this.state.searchingForLocalBackups || this.state.searchingForCloudBackups
                                ? <div>
                                    <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="search-pending-spinner">
                                        <span className="sr-only">Search Pending...</span>
                                    </Spinner>
                                        <span className="pending-message cloud-search-message">
                                            Searching For Backups
                                        </span>
                                    </div>
                                : this.state.deletePending 
                                    ? <div>
                                        <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="delete-pending-spinner">
                                            <span className="sr-only">Delete Pending...</span>
                                        </Spinner>
                                            <span className="pending-message cloud-search-message">Deleting Backup...</span>
                                        </div>
                                    : this.state.backupPending
                                        ? <div>
                                            <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="restore-pending-spinner">
                                                <span className="sr-only">Backup Pending...</span>
                                            </Spinner>
                                                <span className="pending-message">
                                                    {this.state.backupState
                                                        ? this.state.backupState
                                                        : 'Backup Pending'
                                                        }
                                                    </span>
                                            </div>
                                        : this.state.restorePending
                                            ? <div>
                                            <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="restore-pending-spinner"  id="restore-pending-spinner">
                                                <span className="sr-only">Restore Pending...</span>
                                            </Spinner>
                                            <span  className="pending-message">Restore Pending</span>
                                            </div>
                                        : this.state.restoreMessage
                                            ? <div className="backup-restore-message restore-success">{this.state.restoreMessage}</div>
                                            : this.state.restoreError
                                                ? <div className="backup-restore-message restore-error">{this.state.restoreError}</div>
                                                : ''
                            }
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12} className="backup-management-addon-table">
                        <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? "backup-management-addon-table-scrollbar mac" : "backup-management-addon-table-scrollbar"} >
                            <BootstrapTable
                                id="backup-management-table"
                                keyField='keyField'
                                data={ tableData }
                                columns={ columns }
                                headerClasses='restore-addon-header'
                                rowClasses='restore-addon-row'
                                noDataIndication={noTableData}
                                />
                        </SimpleBar>
                        </Col>
                    </Row>
                </div>
                
            </div>
        )
    }
}

BackupManagementDialog.propTypes = {
    backupPending: PropTypes.bool,
    backupState: PropTypes.string,
    latestCloudBackup: PropTypes.object,
    onExit: PropTypes.func,
    onOpenBackup: PropTypes.func,
    onSubmit: PropTypes.func,
    opts: PropTypes.object,
    restorePending: PropTypes.bool,
}

export default BackupManagementDialog;