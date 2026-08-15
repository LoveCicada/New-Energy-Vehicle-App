Component({
  properties: {
    unitId: { type: String, value: '' }
  },
  data: { show: false },
  observers: {
    unitId: function (v) {
      this.setData({ show: !!(v && String(v).trim()) })
    }
  },
  methods: {
    onError: function () {
      this.setData({ show: false })
    }
  }
})
