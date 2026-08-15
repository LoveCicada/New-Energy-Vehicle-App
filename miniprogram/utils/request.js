function callFn(name, data) {
  data = data || {}
  return wx.cloud
    .callFunction({ name: name, data: data })
    .then(function (res) {
      return res.result
    })
    .catch(function (err) {
      console.error(name, err)
      throw err
    })
}

module.exports = { callFn }
