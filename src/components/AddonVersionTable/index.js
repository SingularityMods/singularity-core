import './AddonVersionTable.css';

import * as React from 'react';
import { Row, Col } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import BootstrapTable from 'react-bootstrap-table-next';

import UpdateAddonButton from '../Buttons/UpdateAddonButton';

export default class AddonVersionTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            addon: this.props.addon,
            gameVersion: this.props.gameVersion,
            installedAddon: this.props.installedAddon,
            currentlyInstallingFile: this.props.currentlyInstallingFile
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentlyInstallingFile !== prevProps.currentlyInstallingFile
        || this.props.installedAddon !== prevProps.installedAddon) {
            this.setState({
                currentlyInstallingFile: this.props.currentlyInstallingFile,
                installedAddon: this.props.installedAddon
            });
        }
    }

    render() {
        if (['wow_retail', 'wow_retail_ptr', 'wow_retail_beta'].includes(this.state.gameVersion)) {
            var addonVersion = 'retail'
        } else {
            var addonVersion = 'classic'
        }
        const columns = [{
            dataField: 'fileName',
            text: 'File Name'
        }, {
            dataField: 'fileDate',
            text: 'Date',
        }, {
            dataField: 'gameVersion',
            text: 'Patch',
            formatter: (cellContent, row, rowIndex, gameVersion) => {
                return (cellContent[0])
            }
        }, {
            dataField: 'releaseType',
            text: 'Type',
                formatter: (cellContent, row, rowIndex, gameVersion) => {
                    if (cellContent == 1) {
                        return ('Release');
                    } else if (cellContent == 2) {
                        return ('Beta');
                    } else if (cellContent == 3) {
                        return ('Alpha');
                    }
                }
        }, {
                dataField: 'fileSource',
                text: 'Source'
        }, {
                dataField: '_id',
                isdummyField: true,
                text: 'Action',
                formatExtraData: { installedAddon: this.state.installedAddon, currentlyInstallingFile: this.state.currentlyInstallingFile },
                formatter: (cellContent, row, rowIndex, extraData) => {
                if (extraData.currentlyInstallingFile == row['_id']) {
                    return (
                        <span className="label label-danger">Updating...</span>
                    )
                } else if (extraData.installedAddon 
                            && extraData.installedAddon.fileName == row.fileName 
                            && extraData.installedAddon.gameVersion == row.gameVersion[0] 
                            && extraData.installedAddon.fileDate == row.fileDate) {
                    return (
                        <UpdateAddonButton handleClick={() => { } } disabled={true} type='Installed' />
                    )
                }
                return (
                    <UpdateAddonButton handleClick={() => this.props.handeInstall(this.state.addon,cellContent)} type='Install' />
                )
            }
        }]
        return (
                <Row>
                    <Col xs={12} className="addon-version-table">
                    {this.state.addon && this.state.addon.gameVersionLatestFiles
                        ?
                        <BootstrapTable
                            className="addon-version-table"
                            keyField={'_id'}
                            data={addonVersion == 'retail'
                                ? this.state.addon.latestRetailFiles
                                : this.state.addon.latestClassicFiles}
                            columns={columns}>
                        </BootstrapTable>
                        : ''
                        }
                    </Col>
                </Row>
        )
    }
}