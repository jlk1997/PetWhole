module.exports = {
  transpileDependencies: ['@dcloudio/uni-ui'],
  configureWebpack: {
    resolve: {
      alias: {
        '@': require('path').resolve(__dirname, '')
      }
    }
  }
} 