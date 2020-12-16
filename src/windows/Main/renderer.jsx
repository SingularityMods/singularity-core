import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import App from '../../containers/App';
import {
  initSentry,
} from '../../renderer-services/sentry';

initSentry();

ReactDOM.render(<App />, document.getElementById('root'));
