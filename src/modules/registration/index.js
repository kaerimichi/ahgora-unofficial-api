const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const phantom = require('phantom')
const atob = require('atob')
const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'
const moment = require('moment')
const { isEqual } = require('lodash')

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
        verified: false,
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
          var parsedPunches = serviceMessage.match(/[0-2][0-9]:[0-5][0-9]/gi).slice(0, -1)
          var transformedPunches = []

          for (var i = 0; i < parsedPunches.length; i++) {
            transformedPunches.push(parsedPunches[i].replace(':', ''))
          }

          output.statusCode = 201
          output.message = 'Registration succeeded.'
          output.punches = parsedPunches
          output.batidas_dia = transformedPunches
        }
      }

      return output
    }, { username, password })

    if (evalResult.result && ctx.query.verify === 'true') {
      const pageHandler = require('../history/pageHandler')
      const scraper = require('../history/scraper')
      const contentHandler = require('../history/contentHandler')
      const pageBody = await pageHandler.getBody(
        ctx.headers.authorization,
        ctx.params.identity,
        moment().format('MM-YYYY')
      )
      const scrapedContent = scraper.getContents(pageBody)
      const content = contentHandler.getContents(scrapedContent)

      if (content && content.monthPunches) {
        const { monthPunches } = content
        const currentDaySummary = monthPunches.find(entry => {
          return entry.date === moment().format('YYYY-MM-DD')
        })

        if (isEqual(evalResult.punches, currentDaySummary.punches)) {
          evalResult.verified = true
        }
      }
    }

    ctx.status = evalResult.statusCode
    ctx.body = evalResult

    await instance.exit()
  } catch (e) {
    ctx.status = 500
    ctx.body = null
  }
})

app
  .use(router.routes())
  .use(router.allowedMethods())

module.exports = app
