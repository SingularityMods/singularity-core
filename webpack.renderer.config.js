const rules = require('./webpack.rules');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const assets = ['img','fonts']; // asset directories


rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    use: [
        {
            loader: 'file-loader',
            options: {
                name: '[name].[ext]',
                outputPath: 'fonts/'
            }
        }
    ],
});


rules.push({
    test: /\.jsx?$/,
    exclude: /node_modules/,
    use: [{
        loader: 'babel-loader',
        options: {
            presets: ['@babel/preset-env',
                '@babel/react', {
                    'plugins': ['@babel/plugin-proposal-class-properties']
                }]
        }
    }],
})

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
    },
    plugins: assets.map(asset => {
        return new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src', asset),
                    to: path.resolve(__dirname, '.webpack/renderer', asset)
                },
                {
                    from: path.resolve(__dirname, 'src', asset),
                    to: path.resolve(__dirname, '.webpack/renderer/main_window', asset)
                },

            ]
        });
    })
};
