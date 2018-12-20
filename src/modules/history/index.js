const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const AhgoraHistoryScraper = require('../../lib/services/AhgoraHistoryScraper')

router.get('/summary/:identity/:period', async ctx => {
  try {
    const ahgoraHistoryScraper = new AhgoraHistoryScraper(
      process.env.SERVICE_URL || 'https://www.ahgora.com.br',
      ctx.headers.authorization,
      ctx.params.identity
    )
    const contents = await ahgoraHistoryScraper.getContents()

    if (!contents.userInfo.registry) {
      ctx.status = 204
      ctx.body = null
    } else {
      ctx.body = contents
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
