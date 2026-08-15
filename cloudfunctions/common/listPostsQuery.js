function buildListWhere(opts) {
  opts = opts || {}
  const where = { status: 'published' }
  if (opts.bucketId) where.bucketId = opts.bucketId
  if (opts.subBrandId) where.subBrandId = opts.subBrandId
  if (opts.tags && opts.tags.length) where.tags = opts.tags
  return where
}

module.exports = { buildListWhere }
