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
    darkMode,
    latestCloudBackup,
    lastRestoreComplete,
    openBackupManagementDialog,
    openBackupRestore,
    openSettings,
    openWowExtras,
    restorePending,
    selected,
    selectedAddonId,
    settingsOpened,
  } = props;
  return (
    <Col md={11} lg={9} className="Main-Content no-float">
      {settingsOpened
        ? <SettingsWindow darkMode={darkMode} onClose={closeSettings} />
        : ''}
      {selected
        ? (
          <GameWindow
            darkMode={darkMode}
            gameId={selected}
            openBackupManagementDialog={openBackupManagementDialog}
            openBackupRestore={openBackupRestore}
            openWowExtras={openWowExtras}
            backupPending={backupPending}
            restorePending={restorePending}
            latestCloudBackup={latestCloudBackup}
            lastRestoreComplete={lastRestoreComplete}
            selectedAddonId={selectedAddonId}
          />
        )
        : <HomePage darkMode={darkMode} openSettings={openSettings} />}
    </Col>
  );
}

MainContent.propTypes = {
  backupPending: PropTypes.bool.isRequired,
  closeSettings: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  latestCloudBackup: PropTypes.instanceOf(Date).isRequired,
  lastRestoreComplete: PropTypes.instanceOf(Date).isRequired,
  openBackupManagementDialog: PropTypes.func.isRequired,
  openBackupRestore: PropTypes.func.isRequired,
  openWowExtras: PropTypes.func.isRequired,
  openSettings: PropTypes.func.isRequired,
  restorePending: PropTypes.bool.isRequired,
  selected: PropTypes.number,
  settingsOpened: PropTypes.bool.isRequired,
  selectedAddonId: PropTypes.string.isRequired,
};

MainContent.defaultProps = {
  selected: null,
};

export default MainContent;
