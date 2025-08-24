const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/extension/background.js',
    content: './src/extension/content.js',
    popup: './src/extension/popup.js',
    sidebar: './src/extension/sidebar.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'src/extension/[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/extension/*.html', to: 'src/extension/[name][ext]' },
        { from: 'src/extension/*.css', to: 'src/extension/[name][ext]' },
        { from: 'icons', to: 'icons' },
        { from: 'src/backend', to: 'src/backend' },
        { from: 'src/shared', to: 'src/shared' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.json']
  },
  mode: 'development',
  devtool: 'source-map'
};
