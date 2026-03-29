// Minimal, safe Webpack config to run the existing React (Vite) app
// without changing source code. It preserves env usage via DefinePlugin
// so existing `import.meta.env.VITE_*` references continue to work.

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Helper to JSON-stringify env safely
function env(name, fallback = '') {
  return JSON.stringify(process.env[name] ?? fallback);
}

module.exports = (envArgs, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: path.resolve(__dirname, 'src', 'main.jsx'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
      assetModuleFilename: 'assets/[name][ext]',
      publicPath: '/'
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    module: {
      rules: [
        // Allow extensionless ESM imports like '../config/api'
        {
          test: /\.m?jsx?$/,
          resolve: { fullySpecified: false }
        },
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: { importLoaders: 1 }
            },
            {
              loader: 'postcss-loader'
            }
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'index.html'),
        inject: 'body'
      }),
      // Shim Vite env access used in code: import.meta.env.VITE_API_BASE_URL
      new webpack.DefinePlugin({
        'import.meta.env.VITE_API_BASE_URL': env('VITE_API_BASE_URL', 'http://localhost:5003'),
        // Provide an object so code that inspects import.meta.env doesn't crash
        'import.meta.env': '({})'
      })
    ],
    devtool: isProd ? 'source-map' : 'eval-source-map',
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'public')
      },
      historyApiFallback: true,
      host: 'localhost',
      port: 5173, // keep the same dev port as Vite to avoid changes
      hot: true,
      compress: true
      // If you need proxying instead of VITE_API_BASE_URL, uncomment and adjust:
      // proxy: {
      //   '/api': {
      //     target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
      //     changeOrigin: true
      //   }
      // }
    }
  };
};


