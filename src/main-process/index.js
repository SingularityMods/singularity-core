exports.getAppInfoSync = require('./App/app-info-sync');
exports.acceptTermsAsync = require('./App/accept-terms-async');
exports.openLogDirAsync = require('./App/open-log-dir-async');

exports.loginAsync = require("./Login/login-async");
exports.signupAsync = require("./Signup/signup-async");
exports.getProfileSync = require('./AuthBar/get-profile-sync');
exports.logoutAsync = require('./Logout/logout-async');
exports.profileAsync = require('./Profile/profile-async');

exports.backupAsync = require('./Backup/backup-async');
exports.deleteBackupAsync = require('./Backup/delete-backup-async');
exports.getCloudBackupsAsync = require('./Backup/get-cloud-backups-async');
exports.getLocalBackupsAsync = require('./Backup/get-local-backups-async');
exports.getLocalBackupsSync = require('./Backup/get-local-backups-sync');

exports.getSyncProfileUpdateStateSync = require('./Sync/get-sync-profile-update-state-sync');
exports.getSyncEnabledSync = require('./Sync/get-sync-enabled-sync');
exports.enableAddonSyncAsync = require('./Sync/enable-addon-sync-async');
exports.toggleAddonSyncAsync = require('./Sync/toggle-addon-sync-async');
exports.triggerSyncAsync = require('./Sync/trigger-sync-async');
exports.setAddonSyncProfileAsync = require('./Sync/set-sync-profile-async');

exports.restoreGranularBackupAsync = require('./Restore/restore-granular-backup-async');

exports.setAppSettingsAsync = require('./Settings/set-app-settings-async');
exports.setBackupDirAsync = require('./Settings/set-app-settings-async');
exports.updateWowPathAsync = require('./Settings/update-wow-path-async');
exports.toggleSidebarAsync = require('./Settings/toggle-sidebar-async');
exports.getAppSettingsSync = require('./Settings/get-app-settings-sync');

exports.getGameDataSync = require('./Game/get-game-data-sync');
exports.getGameSettingsSync = require('./Game/get-game-settings-sync');
exports.findGameManualAsync = require('./Game/find-game-manual-async');
exports.findGameAutoAsync = require('./Game/find-game-auto-async');

exports.changeAddonBrachAsync = require('./Addon/change-addon-breach-async');
exports.findAddonsAsync = require('./Addon/find-addons-async');
exports.addonSearchAsync = require('./Addon/addon-search-async');
exports.uninstallAddonAsync = require('./Addon/uninstall-addon-async');
exports.updateAddonAsync = require('./Addon/update-addon-async');
exports.installAddonFileAsync = require('./Addon/install-addon-file-async');
exports.installAddonAsync = require('./Addon/install-addon-async');
exports.addonDetailsAsync = require('./Addon/addon-details-async');
exports.openAddonDirAsync = require('./Addon/open-addon-directory-async');
exports.toggleAddonAutoUpdateAsync = require('./Addon/toggle-addon-auto-update-async');
exports.toggleAddonIgnoreUpdateAsync = require('./Addon/toggle-addon-ignore-update-async');