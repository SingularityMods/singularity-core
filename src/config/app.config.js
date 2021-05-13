import devConfig from './app.config.dev';
import prodConfig from './app.config.prod';

const AppConfig = process.env.BUILD_ENV === 'dev'
  ? devConfig : prodConfig;

export default AppConfig;
