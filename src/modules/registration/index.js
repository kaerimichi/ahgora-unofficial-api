const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const registration = new Koa()
const phantom = require('phantom')
const atob = require('atob')
const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'

router.post('/register/:account', async ctx => {
  try {
    const [ username, password ] = atob(ctx.headers.authorization.split(' ')[1]).split(':')
    const account = ctx.params.account
    const instance = await phantom.create()
    const page = await instance.createPage()
    let evalResult

    await page.open(`${baseUrl}/batidaonline/index/${account}/`)
    evalResult = await page.evaluate(function (params) {
      const output = { error: false, statusCode: 200, message: '' }

      $('input[name=account]').val(String(params.username))
      $('input[name=password]').val(String(params.password))
      $('#botao_entrar').trigger('click')

      const serviceMessage = $('.noty_text').text()
      output.originalMessage = serviceMessage

      switch (serviceMessage) {
        case 'Este funcionário não possui permissão para utilizar este dispositivo.': {
          output.error = true
          output.statusCode = 401
          output.message = 'This user is not allowed.'

          break
        }
        case 'Usuário ou senha incorretos': {
          output.error = true
          output.statusCode = 401
          output.message = 'Wrong username or password.'

          break
        }
        default: {
          output.statusCode = 201
          output.message = 'Registration succeded.'
        }
      }

      return output
    }, { username, password })

    ctx.status = evalResult.statusCode
    ctx.body = evalResult

    await instance.exit()
  } catch (e) {
    ctx.status = 500
    ctx.body = null
  }
})

registration
  .use(router.routes())
  .use(router.allowedMethods())

module.exports = registration
