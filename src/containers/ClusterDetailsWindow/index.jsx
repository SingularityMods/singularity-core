import './ClusterDetailsWindow.css';
import 'simplebar/dist/simplebar.min.css';

import SimpleBar from 'simplebar-react';
import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import { ipcRenderer } from 'electron';

import AddonDetailsWindow from '../../components/AddonDetailsWindow';
import ClusterAddonTable from '../../components/ClusterAddonTable';
import GameMenuButton from '../../components/Buttons/GameMenuButton';
import UpdateAddonButton from '../../components/Buttons/UpdateAddonButton';

function getLatestFile(addon, addonVersion) {
  const possibleFiles = addon.latestFiles.filter((file) => (
    file.gameVersionFlavor === addonVersion
  ));
  console.log(possibleFiles);
  if (possibleFiles && possibleFiles.length > 0) {
    return possibleFiles.reduce((a, b) => ((a.releaseType < b.releaseType) ? a : b));
  }
  return null;
}

class ClusterDetailsWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      selectedAddon: null,
    };
    this.selectAddon = this.selectAddon.bind(this);
    this.deselectAddon = this.deselectAddon.bind(this);
    this.installAddon = this.installAddon.bind(this);
    this.installCluster = this.installCluster.bind(this);
  }

  selectAddon(selectedAddon) {
    this.setState({
      selectedAddon,
    });
  }

  deselectAddon() {
    this.setState({
      selectedAddon: null,
    });
  }

  installAddon(addon) {
    console.log(addon);

    const {
      cluster,
    } = this.props;

    const latestFile = getLatestFile(addon, cluster.gameVersion);
    ipcRenderer.invoke('install-addon-from-cluster', cluster.gameId, cluster.gameVersion, addon, latestFile._id)
      .then((installedAddon) => {
        console.log('installed');
      })
      .catch(() => {
        console.log('error');
      });
  }

  installCluster() {
    console.log('Install Cluster');
  }

  render() {
    const {
      errorMessage,
      selectedAddon,
    } = this.state;
    const {
      cluster,
      handleGoBack,
    } = this.props;
    console.log(cluster);
    console.log(errorMessage);
    const numTags = cluster.tags.length;

    function getGameName(gameId) {
      if (gameId === 1) {
        return 'World of Warcraft';
      }
      if (gameId === 2) {
        return 'Elder Scrolls Online';
      }
      return '';
    }

    function getGameVersion(gameVersion) {
      if (gameVersion === 'wow_retail') {
        return 'Retail';
      }
      if (gameVersion === 'wow_classic') {
        return 'Classic';
      }
      return '';
    }

    return (
      <div id="ClusterDetailsWindow" className={process.platform === 'darwin' ? 'mac' : ''}>
        <Row>
          <Col className="game-banner">
            <img className="game-banner-image" alt="Addon banner" src={cluster.bannerPath} />
          </Col>
        </Row>
        {
          selectedAddon
            ? (
              <AddonDetailsWindow
                addonId={selectedAddon}
                gameId={cluster.gameId}
                gameVersion={cluster.gameVersion}
                handleGoBack={this.deselectAddon}
              />
            )
            : (
              <div className="cluster-details-content">
                <SimpleBar scrollbarMaxSize={50} id="cluster-details-scrollbar">
                  <Row className="cluster-details-top-menu">
                    <Col xs="12">
                      <GameMenuButton handleClick={handleGoBack} type="Back" />
                      <UpdateAddonButton className="install-button" handleClick={this.installCluster} type="Install Cluster" />
                    </Col>
                  </Row>
                  <Row className="cluster-info-row">
                    <Col xs="12" className="cluster-info">
                      <Row>
                        <Col xs="10">
                          <span className="cluster-info-bold cluster-name">{cluster.name}</span>
                        </Col>
                      </Row>
                      <Row>
                        <Col xs="12" className="cluster-info-small">
                          by
                          {' '}
                          {cluster.user.username}
                        </Col>
                      </Row>
                      <Row>
                        <Col xs="12" className="cluster-additional-info">
                          <span className="cluster-info-small">
                            {getGameName(cluster.gameId)}
                          </span>
                          <span className="cluster-info-small cluster-info-pad-left">
                            {getGameVersion(cluster.gameVersion)}
                          </span>
                        </Col>
                      </Row>
                      <Row>
                        <Col xs="12" className="cluster-additional-info">
                          <span className="cluster-info-small">
                            {cluster.downloads}
                            {' '}
                            Downloads
                          </span>
                          <span className="cluster-info-small cluster-info-pad-left">
                            Tags:
                            {' '}
                            {cluster.tags && cluster.tags.map((tag, i) => (
                              <span className="cluster-tag" key={tag}>
                                {tag}
                                {numTags > (i + 1) ? ', ' : ''}
                              </span>
                            ))}
                            {cluster.tags.length === 0
                              ? 'None'
                              : ''}
                          </span>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                  <Row className="cluster-details-section">
                    <ClusterAddonTable
                      addons={cluster.addons}
                      installedAddons={cluster.installedAddons}
                      gameVersion={cluster.gameVersion}
                      gameId={cluster.gameId}
                      keyField="_id"
                      handleSelectAddon={this.selectAddon}
                      installAddon={this.installAddon}
                    />
                  </Row>
                </SimpleBar>
              </div>
            )
        }
      </div>
    );
  }
}

ClusterDetailsWindow.propTypes = {
  cluster: PropTypes.object.isRequired,
  handleGoBack: PropTypes.func.isRequired,
};

export default ClusterDetailsWindow;
