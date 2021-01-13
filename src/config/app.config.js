import devConfig from './app.config.dev';
import prodConfig from './app.config.prod';

const AppConfig = process.env.BUILD_ENV === 'prod'
  || process.env.BUILD_ENV === 'oss' ? prodConfig : devConfig;

export default AppConfig;
