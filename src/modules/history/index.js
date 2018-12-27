const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const AhgoraIntegration = require('../../lib/services/AhgoraIntegration')

router.get('/summary/:identity/:period', async ctx => {
  try {
    const ahgoraIntegration = new AhgoraIntegration(
      process.env.SERVICE_URL,
      ctx.headers.authorization,
      ctx.params.identity
    )
    const contents = await ahgoraIntegration.getHistory(ctx.params.period)

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
