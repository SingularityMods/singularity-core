import './WowExtrasDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Button, Tabs, Tab, Form, FormControl, FormGroup,
} from 'react-bootstrap';
import Switch from 'react-switch';
import BootstrapTable from 'react-bootstrap-table-next';
import ReactTooltip from 'react-tooltip';
import SimpleBar from 'simplebar-react';

import { ipcRenderer } from 'electron';

class WowExtrasDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'wago',
      currentSubTab: 'weakauras',
      enabled: false,
      wa: [],
      plater: [],
      apiKey: '',
      apiKeyLocked: true,
      errorMessage: null,
    };
    this.toggleMenuTab = this.toggleMenuTab.bind(this);
    this.toggleSubMenuTab = this.toggleSubMenuTab.bind(this);
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.unlockApiKey = this.unlockApiKey.bind(this);
    this.changeApiKey = this.changeApiKey.bind(this);
    this.submitApiKey = this.submitApiKey.bind(this);
  }

  componentDidMount() {
    const {
      gameVersion,
    } = this.props;
    ipcRenderer.invoke('get-wago-settings', gameVersion)
      .then((wago) => {
        const {
          enabled,
          wa,
          plater,
        } = wago;
        if (plater) {
          plater.sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            return 1;
          });
        }
        if (wa) {
          wa.sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            return 1;
          });
        }
        this.setState({
          enabled,
          wa,
          plater,
        });
      })
      .catch((error) => {
        this.setState({
          errorMessage: error.message,
        });
      });
    ipcRenderer.invoke('get-wago-api-key')
      .then((apiKey) => {
        this.setState({
          apiKey,
        });
      })
      .catch((error) => {
        this.setState({
          errorMessage: error.message,
        });
      });
  }

  toggleMenuTab(selectedTab) {
    this.setState({
      currentTab: selectedTab,
    });
  }

  toggleSubMenuTab(selectedTab) {
    this.setState({
      currentSubTab: selectedTab,
    });
  }

  toggleEnabled(checked) {
    const {
      gameVersion,
    } = this.props;
    ipcRenderer.invoke('toggle-wago', gameVersion, checked)
      .then(() => {
        this.setState({
          enabled: checked,
        });
        if (checked) {
          ipcRenderer.invoke('check-wago-updates', gameVersion)
            .then((wago) => {
              const {
                enabled,
                wa,
                plater,
              } = wago;
              if (plater) {
                plater.sort((a, b) => {
                  if (a.name < b.name) {
                    return -1;
                  }
                  return 1;
                });
              }
              if (wa) {
                wa.sort((a, b) => {
                  if (a.name < b.name) {
                    return -1;
                  }
                  return 1;
                });
              }
              this.setState({
                enabled,
                wa,
                plater,
              });
            })
            .catch((error) => {
              this.setState({
                errorMessage: error.message,
              });
            });
        }
      })
      .catch((error) => {
        this.setState({
          errorMessage: error.message,
        });
      });
  }

  unlockApiKey() {
    this.setState({
      apiKeyLocked: false,
    });
  }

  changeApiKey(e) {
    this.setState({
      apiKey: e.target.value,
    });
  }

  submitApiKey(e) {
    e.preventDefault();
    const { apiKey } = this.state;
    ipcRenderer.invoke('set-wago-api-key', apiKey)
      .then(() => {
        this.setState({
          apiKeyLocked: true,
        });
      })
      .catch((error) => {
        this.setState({
          errorMessage: error.message,
        });
      });
  }

  render() {
    const {
      onExit,
      wagoUpdating,
    } = this.props;
    const {
      currentTab,
      currentSubTab,
      enabled,
      wa,
      plater,
      apiKey,
      apiKeyLocked,
      errorMessage,
    } = this.state;

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
      <div className="no-data-label">No scripts found!</div>);

    const columns = [
      {
        dataField: '_id',
        hidden: true,
        text: 'id',
      },
      {
        dataField: 'name',
        align: 'center',
        headerAlign: 'center',
        text: 'Name',
        sort: true,
        formatter: (cell, row) => (
          <a
            className="table-link"
            target="_blank"
            rel="noreferrer"
            href={row.url}
          >
            {cell}
          </a>
        ),
      }, {
        dataField: 'account',
        align: 'center',
        headerAlign: 'center',
        text: 'WoW Account',
        sort: true,
      }, {
        dataField: 'modified',
        align: 'center',
        headerAlign: 'center',
        text: 'Last updated',
        sort: true,
        formatter: (cellContent) => (
          formatDate(new Date(cellContent))
        ),
      },
    ];

    return (
      <div id="WowExtrasDialog">
        <div className="content">
          <Row>
            <Col xs={{ span: 2, offset: 10 }} className="exit pull-right">
              <Button className="dialog-button back-button" id="close-wow-extras-btn" onClick={onExit}>Back</Button>
            </Col>
          </Row>
          <Row>
            <Col xs={12} className="wow-extras-dialog-title">
              <h2>Extras</h2>
            </Col>
          </Row>
          <Row>
            <Col xs={12} id="extras-menu">
              <Tabs
                id="wow-extras-menu-tabs"
                activeKey={currentTab}
                onSelect={this.toggleMenuTab}
              >
                <Tab
                  className={currentTab === 'wago' ? 'extras-menu-tab selected' : 'extras-menu-tab'}
                  eventKey="wago"
                  title="Wago"
                />
              </Tabs>
            </Col>
          </Row>
          <Row>
            <Col xs={12} id="extras-tab-window">
              <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? 'wow-extras-scrollbar mac' : 'wow-extras-scrollbar'}>
                {currentTab === 'wago'
                  ? (
                    <Row>
                      <Col xs={12} id="wago-tab" className="extras-tab-content">
                        <Row>
                          <Col xs={12} className="extras-title">
                            <h4>
                              Wago Auto Updates
                            </h4>
                          </Col>
                        </Row>
                        <Row>
                          <Col xs={12} className="extras-header">
                            <Row>
                              <Col xs={12} className="wago-header-item" id="wago-enabled">
                                <div>
                                  <span className="switch-label">Enabled:</span>
                                  <Switch
                                    id="wagoEnabled"
                                    disabled={wagoUpdating}
                                    onChange={this.toggleEnabled}
                                    checked={enabled}
                                    className="settings-switch"
                                    onColor="#00cc00"
                                    height={20}
                                    width={40}
                                    activeBoxShadow="0 0 2px 3px #00cc00"
                                  />
                                </div>
                              </Col>
                            </Row>
                            <Row>
                              <Col xs={12} className="wago-header-item" id="wago-api-key">
                                <span
                                  className="header-label"
                                >
                                  API Key:
                                </span>
                                <ReactTooltip id="apiTootip">
                                  Not required but lets you update private scripts you maintain.
                                </ReactTooltip>
                                <Form
                                  data-tip
                                  data-for="apiTootip"
                                >
                                  <FormGroup>
                                    <FormControl
                                      id="apiKey"
                                      name="apiKey"
                                      type="text"
                                      autoComplete="off"
                                      value={apiKey}
                                      onChange={this.changeApiKey}
                                      readOnly={apiKeyLocked}
                                      onKeyPress={(event) => {
                                        if (event.key === 'Enter') {
                                          this.submitApiKey(event);
                                        }
                                      }}
                                    />
                                    {apiKeyLocked
                                      ? (
                                        <Button
                                          id="unlock-api-key-button"
                                          className="dialog-button api-key-button"
                                          onClick={this.unlockApiKey}
                                        >
                                          Change
                                        </Button>
                                      )
                                      : (
                                        <Button
                                          id="submit-api-key-button"
                                          className="dialog-button api-key-button"
                                          onClick={this.submitApiKey}
                                        >
                                          Submit
                                        </Button>
                                      )}
                                  </FormGroup>
                                </Form>
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                        <Row>
                          <Col xs={12} id="extras-sub-menu">
                            <Tabs
                              id="wow-extras-sub-menu-tabs"
                              activeKey={currentSubTab}
                              onSelect={this.toggleSubMenuTab}
                            >
                              <Tab
                                className={currentSubTab === 'weakauras' ? 'extras-menu-tab selected' : 'extras-menu-tab'}
                                eventKey="weakauras"
                                title="WeakAuras"
                              />
                              <Tab
                                className={currentSubTab === 'plater' ? 'extras-menu-tab selected' : 'extras-menu-tab'}
                                eventKey="plater"
                                title="Plater"
                              />
                            </Tabs>
                          </Col>
                        </Row>
                        <Row>
                          <Col xs={12} className="error-message-section">
                            {errorMessage
                              ? (
                                <span classNme="error-message">{errorMessage}</span>
                              )
                              : ''}
                          </Col>
                        </Row>
                        <Row>
                          <Col xs={12} className="wago-table-section">
                            {currentSubTab === 'weakauras'
                              ? (
                                <div className="wago-table">
                                  <BootstrapTable
                                    keyField="_id"
                                    data={wa || []}
                                    columns={columns}
                                    noDataIndication={noTableData}
                                    headerClasses="table-header"
                                    rowClasses="table-row"
                                  />
                                </div>
                              )
                              : ''}
                            {currentSubTab === 'plater'
                              ? (
                                <div className="wago-table">
                                  <BootstrapTable
                                    keyField="_id"
                                    data={plater || []}
                                    columns={columns}
                                    noDataIndication={noTableData}
                                    headerClasses="table-header"
                                    rowClasses="table-row"
                                  />
                                </div>
                              )
                              : ''}
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  )
                  : ''}
              </SimpleBar>
            </Col>
          </Row>
        </div>
      </div>
    );
  }
}

WowExtrasDialog.propTypes = {
  onExit: PropTypes.func.isRequired,
  gameVersion: PropTypes.string.isRequired,
  wagoUpdating: PropTypes.bool.isRequired,
};

export default WowExtrasDialog;
