const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    popup: './src/popup/index.jsx',
    background: './src/background/index.js',
    content: './src/content/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icons', to: 'icons', noErrorOnMissing: true }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  optimization: {
    splitChunks: false
  },
  devtool: false
};
