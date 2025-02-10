const { merge } = require('webpack-merge');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const base = require('./webpack.config.js');

const config = {
  mode: 'development',
  devServer: {
    hot: true,
    host: '0.0.0.0',
    allowedHosts: 'all',
    historyApiFallback: true,
    port: '1405',
    client: { overlay: false },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [require.resolve('react-refresh/babel')],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new ReactRefreshWebpackPlugin({
      overlay: false,
    }),
  ],
};

module.exports = merge(base, config);
