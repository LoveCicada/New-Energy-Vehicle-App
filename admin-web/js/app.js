;(function () {
  const tabs = ['pending', 'published', 'ingest', 'create']

  function switchTab(name) {
    tabs.forEach(function (t) {
      document.getElementById('tab-' + t).classList.toggle('hidden', t !== name)
    })
  }

  document.querySelectorAll('nav [data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tab = btn.getAttribute('data-tab')
      switchTab(tab)
      if (tab === 'pending') loadList('pending_review', 'tab-pending')
      if (tab === 'published') loadList('published', 'tab-published')
      if (tab === 'ingest') loadIngest()
    })
  })

  async function loadList(status, elId) {
    const el = document.getElementById(elId)
    el.innerHTML = '<p>加载中…</p>'
    try {
      const res = await window.AdminAPI.call('adminListPosts', { status: status })
      if (!res.ok) {
        el.innerHTML = '<p class="err">' + (res.error || '加载失败') + '</p>'
        return
      }
      if (!res.list.length) {
        el.innerHTML = '<p class="hint">暂无数据</p>'
        return
      }
      el.innerHTML = res.list
        .map(function (p) {
          return (
            '<article class="card" data-id="' +
            p._id +
            '">' +
            '<h3>' +
            escapeHtml(p.title || '') +
            '</h3>' +
            '<div class="meta">' +
            escapeHtml(p.bucketId || '') +
            ' / ' +
            escapeHtml(p.subBrandId || '') +
            ' · ' +
            escapeHtml(p.reviewReason || '') +
            '</div>' +
            '<div class="body-preview">' +
            escapeHtml(p.body || '') +
            '</div>' +
            (p.sourceUrl
              ? '<p><a href="' + escapeHtml(p.sourceUrl) + '" target="_blank" rel="noopener">原文</a></p>'
              : '') +
            '<div>' +
            (status === 'pending_review'
              ? '<button data-act="publish">发布</button><button data-act="offline">丢弃</button>'
              : '<button data-act="offline">下架</button>') +
            '</div></article>'
          )
        })
        .join('')

      el.querySelectorAll('.card').forEach(function (card) {
        card.querySelectorAll('button[data-act]').forEach(function (b) {
          b.addEventListener('click', async function () {
            const id = card.getAttribute('data-id')
            const act = b.getAttribute('data-act')
            const name = act === 'publish' ? 'adminPublish' : 'adminOffline'
            const r = await window.AdminAPI.call(name, { id: id })
            if (!r.ok) alert('失败：' + (r.error || r.reason || ''))
            else loadList(status, elId)
          })
        })
      })
    } catch (e) {
      el.innerHTML = '<p class="err">' + escapeHtml(e.message || String(e)) + '</p>'
    }
  }

  async function loadIngest() {
    const el = document.getElementById('tab-ingest')
    el.innerHTML = '<p>加载中…</p>'
    try {
      const res = await window.AdminAPI.call('adminIngestLog', {})
      if (!res.ok) {
        el.innerHTML = '<p class="err">' + (res.error || '') + '</p>'
        return
      }
      el.innerHTML = (res.list || [])
        .map(function (row) {
          const bad = row.fetchStatus === 'error'
          return (
            '<article class="card' +
            (bad ? ' err' : '') +
            '"><div class="meta">' +
            escapeHtml(row.fetchStatus || '') +
            ' · ' +
            escapeHtml(row.pageUrl || '') +
            '</div><div>' +
            escapeHtml(row.errorMessage || '') +
            '</div></article>'
          )
        })
        .join('') || '<p class="hint">暂无日志</p>'
    } catch (e) {
      el.innerHTML = '<p class="err">' + escapeHtml(e.message || String(e)) + '</p>'
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  async function save(publish) {
    const payload = {
      bucketId: document.getElementById('c-bucket').value,
      subBrandId: document.getElementById('c-sub').value.trim(),
      title: document.getElementById('c-title').value.trim(),
      summary: document.getElementById('c-summary').value.trim(),
      body: document.getElementById('c-body').value,
      priceText: document.getElementById('c-price').value.trim(),
      launchStatus: document.getElementById('c-launch').value,
      sourceUrl: document.getElementById('c-url').value.trim(),
      publish: publish
    }
    const res = await window.AdminAPI.call('adminUpsertPost', payload)
    if (!res.ok) alert('失败：' + (res.error || ''))
    else alert('已保存')
  }

  document.getElementById('btn-save-draft').addEventListener('click', function () {
    save(false)
  })
  document.getElementById('btn-save-publish').addEventListener('click', function () {
    save(true)
  })

  window.AdminApp = {
    refresh: function () {
      switchTab('pending')
      loadList('pending_review', 'tab-pending')
    }
  }

  if (window.AdminAPI.token) window.AdminApp.refresh()
})()
