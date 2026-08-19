const config = {
  appId: 'wxb2f1332cae0882b1',
  envId: '',
  adUnitIdFeed: '',
  adUnitIdDetail: ''
}

module.exports = {
  get() {
    return Object.assign({}, config)
  }
}
