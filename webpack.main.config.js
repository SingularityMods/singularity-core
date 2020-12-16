const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const assets = ['icons','gifs','images']; // asset directories

const plugins = assets.map(asset => {
  return new CopyWebpackPlugin({
      patterns: [
          {
              from: path.resolve(__dirname, 'assets', asset),
              to: path.resolve(__dirname, '.webpack/main/assets', asset)
          },
      ],
  });
});

if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push(
    new SentryWebpackPlugin({

      // webpack specific configuration
      include: ".",
      ignore: ["node_modules", "webpack.config.js"],
    })
  )
}

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
    },
    plugins: plugins
};
