(function () {
  var BUCKETS = [
    { id: '', name: '全部' },
    { id: 'byd', name: '比亚迪' },
    { id: 'geely', name: '吉利' },
    { id: 'huawei', name: '华为系列' },
    { id: 'xiaomi', name: '小米' }
  ]
  var SUB_BY_BUCKET = {
    byd: [
      { id: 'byd', name: '比亚迪' },
      { id: 'denza', name: '腾势' },
      { id: 'yangwang', name: '仰望' },
      { id: 'fangchengbao', name: '方程豹' }
    ],
    geely: [
      { id: 'geely', name: '吉利' },
      { id: 'lynkco', name: '领克' },
      { id: 'zeekr', name: '极氪' }
    ],
    huawei: [
      { id: 'aito', name: '问界' },
      { id: 'zhijie', name: '智界' },
      { id: 'xiangjie', name: '享界' },
      { id: 'zunjie', name: '尊界' },
      { id: 'shangjie', name: '尚界' }
    ],
    xiaomi: [{ id: 'xiaomi', name: '小米' }]
  }
  var TAGS = ['SUV', '轿车', 'MPV', '增程', '纯电', '插混']
  var LAUNCH = { teaser: '预热', presale: '预售', launched: '上市', facelift: '改款' }
  var BUCKET_NAME = { byd: '比亚迪', geely: '吉利', huawei: '华为系列', xiaomi: '小米' }

  var state = {
    posts: [],
    bucketId: '',
    subBrandId: '',
    tags: [],
    tab: 'feed',
    detailId: null
  }

  function $(id) {
    return document.getElementById(id)
  }

  function toast(msg) {
    var el = $('toast')
    el.textContent = msg
    el.classList.remove('hidden')
    clearTimeout(toast._t)
    toast._t = setTimeout(function () {
      el.classList.add('hidden')
    }, 1800)
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function filteredPosts() {
    return state.posts.filter(function (p) {
      if (state.bucketId && p.bucketId !== state.bucketId) return false
      if (state.subBrandId && p.subBrandId !== state.subBrandId) return false
      if (state.tags.length) {
        var ok = state.tags.every(function (t) {
          return (p.tags || []).indexOf(t) >= 0
        })
        if (!ok) return false
      }
      return p.status === 'published'
    })
  }

  function renderChips() {
    $('bucket-chips').innerHTML = BUCKETS.map(function (b) {
      return (
        '<button type="button" class="chip' +
        (state.bucketId === b.id ? ' on' : '') +
        '" data-bucket="' +
        b.id +
        '">' +
        b.name +
        '</button>'
      )
    }).join('')

    var subs = state.bucketId ? SUB_BY_BUCKET[state.bucketId] || [] : []
    var subEl = $('sub-chips')
    if (!subs.length) {
      subEl.classList.add('hidden')
      subEl.innerHTML = ''
    } else {
      subEl.classList.remove('hidden')
      subEl.innerHTML =
        '<button type="button" class="chip' +
        (state.subBrandId === '' ? ' on' : '') +
        '" data-sub="">全部子品牌</button>' +
        subs
          .map(function (s) {
            return (
              '<button type="button" class="chip' +
              (state.subBrandId === s.id ? ' on' : '') +
              '" data-sub="' +
              s.id +
              '">' +
              s.name +
              '</button>'
            )
          })
          .join('')
    }

    $('tag-chips').innerHTML = TAGS.map(function (t) {
      return (
        '<button type="button" class="chip' +
        (state.tags.indexOf(t) >= 0 ? ' on' : '') +
        '" data-tag="' +
        t +
        '">' +
        t +
        '</button>'
      )
    }).join('')
  }

  function renderFeed() {
    var list = filteredPosts()
    var box = $('feed-list')
    var empty = $('feed-empty')
    if (!list.length) {
      box.innerHTML = ''
      empty.classList.remove('hidden')
      return
    }
    empty.classList.add('hidden')
    box.innerHTML = list
      .map(function (p) {
        return (
          '<article class="card feed-item" data-id="' +
          escapeHtml(p.id) +
          '">' +
          '<div class="card-title">' +
          escapeHtml(p.title) +
          '</div>' +
          '<div class="meta">' +
          escapeHtml(BUCKET_NAME[p.bucketId] || p.bucketId) +
          (p.subBrandName ? ' · ' + escapeHtml(p.subBrandName) : '') +
          (p.launchStatus ? ' · ' + escapeHtml(LAUNCH[p.launchStatus] || p.launchStatus) : '') +
          (p.priceText ? ' · ' + escapeHtml(p.priceText) : '') +
          '</div>' +
          '<div class="summary">' +
          escapeHtml(p.summary) +
          '</div></article>'
        )
      })
      .join('')
  }

  function openDetail(id) {
    var post = state.posts.find(function (p) {
      return p.id === id
    })
    if (!post) return
    state.detailId = id
    var fav = NevStore.isFavorited(id)
    $('view-detail').classList.remove('hidden')
    $('detail-body').innerHTML =
      (post.cover
        ? '<img class="detail-cover" src="' + escapeHtml(post.cover) + '" alt="" />'
        : '') +
      '<div class="detail-pad">' +
      '<h1>' +
      escapeHtml(post.title) +
      '</h1>' +
      '<div class="meta">' +
      escapeHtml(BUCKET_NAME[post.bucketId] || '') +
      (post.subBrandName ? ' · ' + escapeHtml(post.subBrandName) : '') +
      (post.launchStatus ? ' · ' + escapeHtml(LAUNCH[post.launchStatus] || '') : '') +
      (post.priceText ? ' · ' + escapeHtml(post.priceText) : '') +
      '</div>' +
      '<div class="tags">' +
      (post.tags || [])
        .map(function (t) {
          return '<span class="tag">' + escapeHtml(t) + '</span>'
        })
        .join('') +
      '</div>' +
      '<div class="body-text">' +
      escapeHtml(post.body) +
      '</div>' +
      '<div class="source">' +
      escapeHtml(post.sourceNote || '来源说明') +
      (post.sourceUrl
        ? ' · <a href="' + escapeHtml(post.sourceUrl) + '" target="_blank" rel="noopener">原文链接</a>'
        : '') +
      '</div>' +
      '<button class="btn" style="margin-top:16px" id="btn-fav">' +
      (fav ? '取消收藏' : '收藏') +
      '</button></div>'

    $('btn-fav').onclick = function () {
      var r = NevStore.toggleFavorite(id)
      if (r.needLogin) {
        toast('请先在「我的」里登录')
        return
      }
      toast(r.favorited ? '已收藏' : '已取消收藏')
      openDetail(id)
      renderMine()
    }
  }

  function closeDetail() {
    state.detailId = null
    $('view-detail').classList.add('hidden')
  }

  function switchTab(tab) {
    state.tab = tab
    ;['feed', 'discover', 'mine'].forEach(function (t) {
      $('view-' + t).classList.toggle('hidden', t !== tab)
    })
    document.querySelectorAll('.tabbar .tab').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-tab') === tab)
    })
    $('nav-title').textContent =
      tab === 'feed' ? '新车速览' : tab === 'discover' ? '发现' : '我的'
    if (tab === 'mine') renderMine()
  }

  function renderMine() {
    var s = NevStore.get()
    $('mine-guest').classList.toggle('hidden', s.loggedIn)
    $('mine-user').classList.toggle('hidden', !s.loggedIn)
    if (!s.loggedIn) return

    $('quick-follow').innerHTML = BUCKETS.slice(1)
      .map(function (b) {
        return '<button type="button" data-qf="' + b.id + '">' + b.name + '</button>'
      })
      .join('')

    var fl = $('follow-list')
    if (!s.follows.length) fl.innerHTML = '<p class="hint">暂无关注</p>'
    else
      fl.innerHTML = s.follows
        .map(function (id) {
          return (
            '<div class="line"><span>' +
            escapeHtml(BUCKET_NAME[id] || id) +
            '</span><button type="button" data-uf="' +
            id +
            '">取消</button></div>'
          )
        })
        .join('')

    var favPosts = state.posts.filter(function (p) {
      return s.favorites.indexOf(p.id) >= 0
    })
    var fv = $('fav-list')
    if (!favPosts.length) fv.innerHTML = '<p class="hint">暂无收藏</p>'
    else
      fv.innerHTML = favPosts
        .map(function (p) {
          return (
            '<div class="line tap" data-fid="' +
            escapeHtml(p.id) +
            '"><div><div>' +
            escapeHtml(p.title) +
            '</div><div class="hint" style="margin:4px 0 0">' +
            escapeHtml(BUCKET_NAME[p.bucketId] || '') +
            '</div></div></div>'
          )
        })
        .join('')
  }

  function bind() {
    $('bucket-chips').addEventListener('click', function (e) {
      var t = e.target.closest('[data-bucket]')
      if (!t) return
      state.bucketId = t.getAttribute('data-bucket')
      state.subBrandId = ''
      renderChips()
      renderFeed()
    })
    $('sub-chips').addEventListener('click', function (e) {
      var t = e.target.closest('[data-sub]')
      if (!t) return
      state.subBrandId = t.getAttribute('data-sub') || ''
      renderChips()
      renderFeed()
    })
    $('tag-chips').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tag]')
      if (!t) return
      var tag = t.getAttribute('data-tag')
      var i = state.tags.indexOf(tag)
      if (i >= 0) state.tags.splice(i, 1)
      else state.tags.push(tag)
      renderChips()
      renderFeed()
    })
    $('feed-list').addEventListener('click', function (e) {
      var t = e.target.closest('[data-id]')
      if (!t) return
      openDetail(t.getAttribute('data-id'))
    })
    $('btn-back').onclick = closeDetail
    document.querySelectorAll('.tabbar .tab').forEach(function (btn) {
      btn.onclick = function () {
        closeDetail()
        switchTab(btn.getAttribute('data-tab'))
      }
    })
    document.querySelectorAll('[data-soon]').forEach(function (el) {
      el.onclick = function () {
        toast('即将上线')
      }
    })
    $('btn-login').onclick = function () {
      NevStore.login()
      toast('已登录')
      renderMine()
    }
    $('btn-logout').onclick = function () {
      NevStore.logout()
      toast('已退出')
      renderMine()
    }
    $('mine-user').addEventListener('click', function (e) {
      var qf = e.target.closest('[data-qf]')
      if (qf) {
        var r = NevStore.toggleFollow(qf.getAttribute('data-qf'))
        toast(r.following ? '已关注' : '已取消关注')
        renderMine()
        return
      }
      var uf = e.target.closest('[data-uf]')
      if (uf) {
        NevStore.toggleFollow(uf.getAttribute('data-uf'))
        toast('已取消关注')
        renderMine()
        return
      }
      var fid = e.target.closest('[data-fid]')
      if (fid) openDetail(fid.getAttribute('data-fid'))
    })
  }

  function loadPosts() {
    return fetch('data/posts.json')
      .then(function (r) {
        if (!r.ok) throw new Error('无法加载 data/posts.json，请用本地静态服务打开 preview/')
        return r.json()
      })
      .then(function (data) {
        state.posts = Array.isArray(data) ? data : data.posts || []
      })
  }

  bind()
  renderChips()
  loadPosts()
    .then(function () {
      renderFeed()
      renderMine()
    })
    .catch(function (e) {
      toast(e.message || '加载失败')
      $('feed-empty').classList.remove('hidden')
      $('feed-empty').textContent = e.message || '加载失败'
    })
})()
