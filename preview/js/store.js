(function (global) {
  var KEY = 'nev_preview_store_v1'

  function read() {
    try {
      var raw = localStorage.getItem(KEY)
      if (!raw) return { loggedIn: false, follows: [], favorites: [] }
      return JSON.parse(raw)
    } catch (e) {
      return { loggedIn: false, follows: [], favorites: [] }
    }
  }

  function write(state) {
    localStorage.setItem(KEY, JSON.stringify(state))
  }

  var Store = {
    get: read,
    login: function () {
      var s = read()
      s.loggedIn = true
      write(s)
    },
    logout: function () {
      write({ loggedIn: false, follows: [], favorites: [] })
    },
    toggleFollow: function (bucketId) {
      var s = read()
      if (!s.loggedIn) return { ok: false, needLogin: true }
      var i = s.follows.indexOf(bucketId)
      if (i >= 0) s.follows.splice(i, 1)
      else s.follows.push(bucketId)
      write(s)
      return { ok: true, following: s.follows.indexOf(bucketId) >= 0 }
    },
    toggleFavorite: function (postId) {
      var s = read()
      if (!s.loggedIn) return { ok: false, needLogin: true }
      var i = s.favorites.indexOf(postId)
      if (i >= 0) s.favorites.splice(i, 1)
      else s.favorites.push(postId)
      write(s)
      return { ok: true, favorited: s.favorites.indexOf(postId) >= 0 }
    },
    isFavorited: function (postId) {
      return read().favorites.indexOf(postId) >= 0
    }
  }

  global.NevStore = Store
})(window)
