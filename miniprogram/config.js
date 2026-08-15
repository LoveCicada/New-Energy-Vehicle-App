const config = {
  envId: 'YOUR_ENV_ID',
  adUnitIdFeed: '',
  adUnitIdDetail: ''
}

module.exports = {
  get() {
    return Object.assign({}, config)
  }
}
