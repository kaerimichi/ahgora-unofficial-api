const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const balance = new Koa()
const pageHandler = require('./pageHandler')
const scraper = require('./scraper')
const contentHandler = require('./contentHandler')

router.get('/:account/:period', async ctx => {
  try {
    const pageBody = await pageHandler.getBody(
      ctx.headers.authorization,
      ctx.params.account,
      ctx.params.period
    )
    const scrapedContent = scraper.getContents(pageBody)

    ctx.body = contentHandler.getContents(scrapedContent)
  } catch (e) {
    ctx.status = 500
    ctx.body = null
  }
})

balance
  .use(router.routes())
  .use(router.allowedMethods())

module.exports = balance
