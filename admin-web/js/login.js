;(function () {
  const loginView = document.getElementById('login-view')
  const appView = document.getElementById('app-view')

  function showApp(loggedIn) {
    loginView.classList.toggle('hidden', loggedIn)
    appView.classList.toggle('hidden', !loggedIn)
  }

  if (window.AdminAPI.token) showApp(true)
  else showApp(false)

  document.getElementById('btn-login').addEventListener('click', async function () {
    try {
      const username = document.getElementById('username').value.trim()
      const password = document.getElementById('password').value
      const res = await window.AdminAPI.call('adminLogin', { username: username, password: password })
      if (!res.ok) {
        alert('登录失败：' + (res.error || ''))
        return
      }
      window.AdminAPI.setToken(res.token)
      showApp(true)
      if (window.AdminApp && window.AdminApp.refresh) window.AdminApp.refresh()
    } catch (e) {
      alert(e.message || String(e))
    }
  })

  document.getElementById('btn-logout').addEventListener('click', function () {
    window.AdminAPI.setToken('')
    showApp(false)
  })

  window.AdminLogin = { showApp: showApp }
})()
