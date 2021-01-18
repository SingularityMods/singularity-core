import 'bootstrap/dist/css/bootstrap.css';
import 'simplebar/dist/simplebar.min.css';
import '@fortawesome/fontawesome-free/js/all';

import '../../Themes.css';
import '../../Fonts.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';
import log from 'electron-log';
import App from '../../containers/App';

import {
  initSentry,
} from '../../renderer-services/sentry';

log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1000;
console.log = log.log;

initSentry();

ReactDOM.render(<App />, document.getElementById('root'));
