const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const registration = new Koa()
const phantom = require('phantom')
const atob = require('atob')
const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'

router.post('/register/:identity', async ctx => {
  try {
    const userAgent = ctx.headers['user-agent'] || ''
    const [ username, password ] = atob(ctx.headers.authorization.split(' ')[1]).split(':')
    const identity = ctx.params.identity
    const instance = await phantom.create()
    const page = await instance.createPage()
    let evalResult

    page.property(
      'customHeaders',
      { 'User-Agent': userAgent }
    )

    await page.open(`${baseUrl}/batidaonline/index/${identity}/`)

    evalResult = await page.evaluate(function (params) {
      // this will be executed on the page
      var output = {
        result: true,
        error: false,
        statusCode: 200,
        message: ''
      }

      $('input[name=account]').val(String(params.username))
      $('input[name=password]').val(String(params.password))
      $('#botao_entrar').trigger('click')

      do { /* some crazy dance ┗(-_- )┓ */ } while (!$('#noty_top_layout_container').length)

      var serviceMessage = $('.noty_text').text()
      output.originalMessage = serviceMessage

      switch (serviceMessage) {
        case 'Este funcionário não possui permissão para utilizar este dispositivo.': {
          output.result = false
          output.error = true
          output.statusCode = 401
          output.message = 'This user is not allowed.'

          break
        }
        case 'Usuário ou senha incorretos': {
          output.result = false
          output.error = true
          output.statusCode = 401
          output.message = 'Wrong username or password.'

          break
        }
        default: {
          output.statusCode = 201
          output.message = 'Registration succeeded.'
          output.punches = serviceMessage.match(/[0-2][0-9]:[0-5][0-9]/gi).slice(0, -1).map(entry => entry.replace(':', ''))
          output.batidas_dia = serviceMessage.match(/[0-2][0-9]:[0-5][0-9]/gi).slice(0, -1).map(entry => entry.replace(':', ''))
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
