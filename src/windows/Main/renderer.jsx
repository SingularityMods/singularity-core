import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/electron';
import { Integrations as TracingIntegrations } from "@sentry/tracing";

import AppConfig from '../../config/app.config'
import App from '../../containers/App';
Sentry.init({ 
  dsn: AppConfig.SENTRY_DSN,
  environment: AppConfig.SENTRY_ENV,
  release: "singularity-core@" + process.env.npm_package_version,
  appName:'singularity-core',
  autoSessionTracking: true,
  integrations: [new TracingIntegrations.BrowserTracing()],
  tracesSampleRate: 1
});
//Sentry.getCurrentHub().getClient().getOptions().enabled = false; 
ReactDOM.render(<App />, document.getElementById('root'));
