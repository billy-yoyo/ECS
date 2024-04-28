const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const plugins = [
  new HtmlWebPackPlugin({
      template: "./src/index.html"
  })
];

if (isProduction) { 
  plugins.push(new MiniCssExtractPlugin());
}

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: {
    main: './src/gasExample.ts',
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [ 
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 
          'css-loader', 
          'less-loader'
        ],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'js/[name].bundle.js'
  },
  plugins: plugins
};
