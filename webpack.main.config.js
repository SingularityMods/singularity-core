const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const assets = ['icons','gifs','images']; // asset directories

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
    plugins: assets.map(asset => {
        return new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'assets', asset),
                    to: path.resolve(__dirname, '.webpack/main/assets', asset)
                },
            ],
        });
    })
};
