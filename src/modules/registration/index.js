const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const app = new Koa()
const phantom = require('phantom')
const atob = require('atob')
const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'
const moment = require('moment')
const { isEqual } = require('lodash')
const bodyParser = require('koa-bodyparser')
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
    const { post } = require('axios')
    const userAgent = ctx.headers['user-agent'] || ''
    const options = {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': userAgent
      }
    }
    const response = await post(
      `${baseUrl}/batidaonline/verifyIdentification`,
      ctx.request.body,
      options
    )

    if (!response.data) {
      throw new Error('Invalid response from server.')
    }

    const { statistics } = await getHistoryContent(
      ctx.request.body.account,
      ctx.request.body.password,
      ctx.params.identity
    )

    response.data.statistics = response.data.result
      ? statistics
      : null

    response.data.punches = response.data.batidas_dia.length
      ? response.data.batidas_dia.map(punch => punch.match(/.{1,2}/g).join(':'))
      : null

    ctx.status = response.status
    ctx.body = response.data
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
