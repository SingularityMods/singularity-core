import './MainContent.css';

import { Col } from 'react-bootstrap';
import * as React from 'react';
import PropTypes from 'prop-types';

import HomePage from '../../components/HomePage';
import GameWindow from '../GameWindow';
import SettingsWindow from '../SettingsWindow';

function MainContent(props) {
  const {
    backupPending,
    closeSettings,
    latestCloudBackup,
    lastRestoreComplete,
    openBackupManagementDialog,
    openBackupRestore,
    openSettings,
    restorePending,
    selected,
    settingsOpened,
  } = props;
  return (
    <Col md={11} lg={9} className="Main-Content no-float">
      {settingsOpened
        ? <SettingsWindow onClose={closeSettings} />
        : ''}
      {selected
        ? (
          <GameWindow
            gameId={selected}
            openBackupManagementDialog={openBackupManagementDialog}
            openBackupRestore={openBackupRestore}
            backupPending={backupPending}
            restorePending={restorePending}
            latestCloudBackup={latestCloudBackup}
            lastRestoreComplete={lastRestoreComplete}
          />
        )
        : <HomePage openSettings={openSettings} />}
    </Col>
  );
}

MainContent.propTypes = {
  backupPending: PropTypes.bool.isRequired,
  closeSettings: PropTypes.func.isRequired,
  latestCloudBackup: PropTypes.instanceOf(Date).isRequired,
  lastRestoreComplete: PropTypes.instanceOf(Date).isRequired,
  openBackupManagementDialog: PropTypes.func.isRequired,
  openBackupRestore: PropTypes.func.isRequired,
  openSettings: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
  selected: PropTypes.number,
  settingsOpened: PropTypes.bool.isRequired,
};

MainContent.defaultProps = {
  selected: null,
};

export default MainContent;
