import 'bootstrap/dist/css/bootstrap.css';
import 'simplebar/dist/simplebar.min.css';
import '@fortawesome/fontawesome-free/js/all';

import '../../Themes.css';

import '../../Fonts.css';

import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import App from '../../containers/App';
import {
  initSentry,
} from '../../renderer-services/sentry';

initSentry();

ReactDOM.render(<App />, document.getElementById('root'));
