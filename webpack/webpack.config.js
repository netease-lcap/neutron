const path = require('path');
const sass = require('sass');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const basePath = path.resolve(__dirname, '../');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    index: path.resolve(basePath, 'src/browser/index.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(basePath, 'dist'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.scss'],
    alias: {
      '@': path.resolve(basePath, 'src/browser/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(css|scss|sass)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { importLoaders: 2 },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(basePath, 'postcss.config.js'),
              },
            },
          },
          {
            loader: 'sass-loader',
            options: { implementation: sass },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: [
          'babel-loader',
        ],
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(basePath, 'src/public/index.html'),
      filename: 'index.html',
    }),
  ],
};
