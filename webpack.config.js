
const path = require('path');
const Dotenv = require('dotenv-webpack');
module.exports = {

  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve('path-browserify'),
      
    },
  },
};
