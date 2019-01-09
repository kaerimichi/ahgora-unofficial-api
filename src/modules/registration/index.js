const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const phantom = require('phantom')
const atob = require('atob')
const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'
const moment = require('moment-timezone')
const { isEqual } = require('lodash')
const bodyParser = require('koa-bodyparser')
const AhgoraIntegration = require('../../lib/services/AhgoraIntegration')
const getHistoryContent = async (username, password, identity) => {
  const btoa = require('btoa')
  const pageHandler = require('../history/pageHandler')
  const scraper = require('../history/scraper')
  const contentHandler = require('../history/contentHandler')
  const hash = btoa(`${username}:${password}`)
  const pageBody = await pageHandler.getBody(
    `Basic ${hash}`, identity, moment().format('MM-YYYY')
  )
  const scrapedContent = scraper.getContents(pageBody)

  return contentHandler.getContents(scrapedContent)
}

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
      var output = {
        statistics: null,
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

      var parsedPunches = serviceMessage.match(/[0-2][0-9]:[0-5][0-9]/gi).slice(0, -1)

      if (parsedPunches.length) {
        var transformedPunches = []

        for (var i = 0; i < parsedPunches.length; i++) {
          transformedPunches.push(parsedPunches[i].replace(':', ''))
        }

        output.statusCode = 201
        output.message = 'Registration succeeded.'
        output.punches = parsedPunches
        output.batidas_dia = transformedPunches
      } else {
        output.result = false
        output.error = true
        output.statusCode = 401
        output.message = 'Registration failed.'
      }

      return output
    }, { username, password })

    if (evalResult.result && ctx.query.verify === 'true') {
      const historyContent = getHistoryContent(username, password, ctx.params.identity)

      if (historyContent && historyContent.monthPunches) {
        const { monthPunches } = historyContent
        const currentDaySummary = monthPunches.find(entry => {
          return entry.date === moment().format('YYYY-MM-DD')
        })

        if (isEqual(evalResult.punches, currentDaySummary.punches)) {
          evalResult.verified = true
          evalResult.statistics = historyContent.statistics
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

router.post('/registerdirect/:identity', async ctx => {
  try {
    const currentDate = moment().format('YYYY-MM-DD')
    const ahgoraIntegration = new AhgoraIntegration(
      process.env.SERVICE_URL,
      ctx.headers.authorization,
      ctx.params.identity
    )
    const historyContent = await ahgoraIntegration.getHistory()

    if (!historyContent.userInfo.registry) {
      throw new Error('Não foi possível validar a batida.')
    }

    const currentPunch = moment().format('HH:mm')
    let dayPunches = historyContent.monthPunches
      .find(e => e.date === currentDate).punches

    if (!dayPunches) dayPunches = []
    if (dayPunches.length > 0 && !ahgoraIntegration.punchIsValid(dayPunches, currentPunch)) {
      throw new Error('Batida duplicada na tolerância.')
    }

    const registrationData = await ahgoraIntegration.register(
      ctx.headers,
      ctx.request.body
    )

    if (!registrationData.result) {
      throw new Error(`Erro no registro: ${registrationData.reason}`)
    }

    dayPunches.push(
      moment(registrationData.time, 'HHmm').format('HH:mm')
    )

    const { statistics, monthPunches } = ahgoraIntegration.recalculate(
      historyContent,
      [{ date: currentDate, punches: dayPunches }]
    )

    ctx.body = {
      punches: monthPunches.find(({ date }) => date === currentDate).punches || [],
      statistics
    }
  } catch (e) {
    ctx.status = 500
    ctx.body = {
      result: false,
      message: e.message
    }
  }
})

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())

module.exports = app
