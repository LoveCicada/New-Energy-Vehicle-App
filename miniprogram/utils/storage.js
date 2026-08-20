const KEYS = {
  user: 'kancar_user',
  follows: 'kancar_follows',
  favorites: 'kancar_favorites',
  feedIntent: 'kancar_feed_intent'
}

function getUser() {
  return wx.getStorageSync(KEYS.user) || null
}

function isLoggedIn() {
  const u = getUser()
  return !!(u && u.loggedIn)
}

function loginLocal() {
  const user = { loggedIn: true, at: Date.now() }
  wx.setStorageSync(KEYS.user, user)
  getApp().globalData.user = user
  return user
}

function getFollows() {
  const v = wx.getStorageSync(KEYS.follows)
  return Array.isArray(v) ? v : []
}

function toggleFollow(bucketId) {
  const ids = getFollows()
  const i = ids.indexOf(bucketId)
  let following
  if (i >= 0) {
    ids.splice(i, 1)
    following = false
  } else {
    ids.push(bucketId)
    following = true
  }
  wx.setStorageSync(KEYS.follows, ids)
  return { following: following, follows: ids }
}

function getFavoriteIds() {
  const v = wx.getStorageSync(KEYS.favorites)
  return Array.isArray(v) ? v : []
}

function isFavorited(postId) {
  return getFavoriteIds().indexOf(postId) >= 0
}

function toggleFavorite(postId) {
  const ids = getFavoriteIds()
  const i = ids.indexOf(postId)
  let favorited
  if (i >= 0) {
    ids.splice(i, 1)
    favorited = false
  } else {
    ids.push(postId)
    favorited = true
  }
  wx.setStorageSync(KEYS.favorites, ids)
  return { favorited: favorited, ids: ids }
}

function setFeedIntent(intent) {
  intent = intent || {}
  wx.setStorageSync(KEYS.feedIntent, {
    bucketId: intent.bucketId ? String(intent.bucketId) : '',
    powerTag: intent.powerTag ? String(intent.powerTag) : ''
  })
}

function consumeFeedIntent() {
  const v = wx.getStorageSync(KEYS.feedIntent)
  wx.removeStorageSync(KEYS.feedIntent)
  if (!v || typeof v !== 'object') return null
  return {
    bucketId: v.bucketId || '',
    powerTag: v.powerTag || ''
  }
}

module.exports = {
  getUser,
  isLoggedIn,
  loginLocal,
  getFollows,
  toggleFollow,
  getFavoriteIds,
  isFavorited,
  toggleFavorite,
  setFeedIntent,
  consumeFeedIntent
}
