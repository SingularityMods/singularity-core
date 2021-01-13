import { ipcRenderer } from 'electron';
import * as Sentry from '@sentry/electron';
import { Integrations as TracingIntegrations } from '@sentry/tracing';

import AppConfig from '../config/app.config';

let enabled = false;

function initSentry() {
  ipcRenderer.invoke('get-app-version')
    .then((version) => {
      Sentry.init({
        dsn: AppConfig.SENTRY_DSN,
        environment: AppConfig.SENTRY_ENV,
        release: `singularity-core@${version}`,
        appName: 'singularity-core',
        autoSessionTracking: true,
        integrations: [new TracingIntegrations.BrowserTracing()],
        tracesSampleRate: 0.2,
        beforeSend: _beforeSend,
      });
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
    return event;
  }
  return null;
}

export {
  initSentry,
  enableSentry,
  disableSentry,
};
