import { app } from 'electron';
import * as Sentry from '@sentry/electron';
import AppConfig from '../config/app.config';

let enabled = false;

function initSentry() {
  Sentry.init({
    dsn: AppConfig.SENTRY_DSN,
    environment: AppConfig.SENTRY_ENV,
    release: `singularity-core@${app.getVersion()}`,
    autoSessionTracking: true,
    beforeSend: _beforeSend,
  });
}

function enableSentry() {
  enabled = true;
}

function disableSentry() {
  enabled = false;
}

function _beforeSend(event) {
  if (!enabled) {
    return null;
  }
  return event;
}

export {
  initSentry,
  enableSentry,
  disableSentry,
};
