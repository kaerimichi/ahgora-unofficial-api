const moment = require('moment')
const atob = require('atob')
const request = require('request-promise-native')
const { post } = require('axios')
const { transform } = require('./helpers/PayloadProcessor')
const { compute, getStringTime } = require('./helpers/TimeComputation')
const DEFAULT_SERVICE_HOST = 'www.ahgora.com.br'
const DUPLICATE_TOLERANCE = 5
const LOGIN_TIMEOUT = 4000
const HISTORY_TIMEOUT = 6000
const REGISTRATION_TIMEOUT = 6000

module.exports = class AhgoraIntegration {
  constructor (url, basicAuthHash, companyId) {
    this.url = url || `https://${DEFAULT_SERVICE_HOST}`
    this.basicAuthHash = basicAuthHash
    this.companyId = companyId
  }

  async getHistory (knownCookie = null, period = moment().format('MM-YYYY')) {
    try {
      const [ username, password ] = atob(this.basicAuthHash.split(' ')[1]).split(':')
      const baseUrl = this.url
      const [ month, year ] = period.split('-')
      const punchesUrl = `${baseUrl}/api-espelho/apuracao/${year}-${month}`
      const loginUrl = `${baseUrl}/externo/login`
      const form = { empresa: this.companyId, matricula: username, senha: password }
      let authCookie = knownCookie
      let cookieJar
      let cookie

      if (!authCookie) {
        const loginResponse = await request({
          form,
          url: loginUrl,
          method: 'POST',
          resolveWithFullResponse: true,
          timeout: LOGIN_TIMEOUT
        })

        authCookie = loginResponse.headers['set-cookie'][0]
      }

      cookie = request.cookie(authCookie)
      cookieJar = request.jar()

      cookieJar.setCookie(cookie, baseUrl)

      return request({ url: punchesUrl, jar: cookieJar, timeout: HISTORY_TIMEOUT })
        .then(transform)
        .then(compute)
        .then(response => { response.knownCookie = authCookie; return response })
    } catch (e) {
      throw e
    }
  }

  recalculate (historyPayload, dates = []) {
    const strDates = dates.map(({ date }) => date)
    let todayPunches
    let lastInterval

    historyPayload.monthPunches.forEach(entry => {
      if (strDates.indexOf(entry.date) === 0) {
        entry.punches = dates.find(e => e.date === entry.date).punches
        todayPunches = entry.punches
      }
    })

    if (todayPunches.length % 2 === 0) {
      lastInterval = moment.duration(
        moment(todayPunches[todayPunches.length - 1], 'HH:mm')
          .diff(moment(todayPunches[todayPunches.length - 2], 'HH:mm'))
      ).asMinutes()
      lastInterval = historyPayload.statistics.monthBalance.completed.asMinutes + lastInterval

      historyPayload.statistics.monthBalance.completed = {
        asMinutes: lastInterval,
        asShortTime: getStringTime(lastInterval)
      }
    }

    return compute(historyPayload)
  }

  register (headers, body) {
    headers['Host'] = DEFAULT_SERVICE_HOST

    return post(
      `${this.url}/batidaonline/verifyIdentification`,
      body,
      { timeout: REGISTRATION_TIMEOUT, headers }
    ).then(response => response.data)
  }

  punchIsValid (punches = [], newPunch = null) {
    const lastPunch = moment(punches[punches.length - 1], 'HH:mm')

    return moment(newPunch, 'HH:mm')
      .diff(lastPunch, 'minutes') >= DUPLICATE_TOLERANCE
  }
}
