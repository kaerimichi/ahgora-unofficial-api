const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const pageHandler = require('./pageHandler')
const scraper = require('./scraper')
const contentHandler = require('./contentHandler')

router.get('/summary/:identity/:period', async ctx => {
  try {
    const pageBody = await pageHandler.getBody(
      ctx.headers.authorization,
      ctx.params.identity,
      ctx.params.period
    )
    const scrapedContent = scraper.getContents(pageBody)
    const content = contentHandler.getContents(scrapedContent)

    if (!content.userInfo.registry) {
      ctx.status = 204
      ctx.body = null
    } else {
      ctx.body = contentHandler.getContents(scrapedContent)
    }
  } catch (e) {
    ctx.status = 500
    ctx.body = null
  }
})

app
  .use(router.routes())
  .use(router.allowedMethods())

module.exports = app
