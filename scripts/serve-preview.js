/**
 * Zero-dependency static server for preview/
 * Usage: node scripts/serve-preview.js
 * Optional: PORT=5173 node scripts/serve-preview.js
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = Number(process.env.PORT) || 5173
const ROOT = path.join(__dirname, '..', 'preview')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || '/').split('?')[0])
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const full = path.join(root, cleaned)
  if (!full.startsWith(root)) return null
  return full
}

const server = http.createServer(function (req, res) {
  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url)
  if (!filePath) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, function (err, st) {
    if (!err && st.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    fs.readFile(filePath, function (readErr, data) {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found: ' + req.url)
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      })
      res.end(data)
    })
  })
})

server.listen(PORT, '127.0.0.1', function () {
  console.log('新车速览 preview: http://127.0.0.1:' + PORT)
  console.log('Serving: ' + ROOT)
  console.log('Press Ctrl+C to stop')
})

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is in use. Try: PORT=5174 node scripts/serve-preview.js')
  } else {
    console.error(e)
  }
  process.exit(1)
})
