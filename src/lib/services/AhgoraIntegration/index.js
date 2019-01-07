const moment = require('moment')
const atob = require('atob')
const request = require('request-promise-native')
const { post } = require('axios')
const { scrape } = require('./helpers/PageScraper')
const { compute } = require('./helpers/TimeComputation')
const DEFAULT_SERVICE_HOST = 'www.ahgora.com.br'
const DUPLICATE_TOLERANCE = 5
const DEFAULT_REQUEST_TIMEOUT = 6000

module.exports = class AhgoraIntegration {
  constructor (url, basicAuthHash, companyId) {
    this.url = url || 'https://www.ahgora.com.br'
    this.basicAuthHash = basicAuthHash
    this.companyId = companyId
  }

  getHistory (period = moment().format('MM-YYYY')) {
    try {
      const [ username, password ] = atob(this.basicAuthHash.split(' ')[1]).split(':')
      const baseUrl = this.url
      const punchesUrl = `${baseUrl}/externo/batidas/${period}`
      const loginUrl = `${baseUrl}/externo/login`
      const form = { empresa: this.companyId, matricula: username, senha: password }

      return request({ url: loginUrl, method: 'POST', form, resolveWithFullResponse: true, timeout: DEFAULT_REQUEST_TIMEOUT }).then(loginResponse => {
        const authCookie = loginResponse.headers['set-cookie'][0]
        const cookie = request.cookie(authCookie)
        const cookieJar = request.jar()

        cookieJar.setCookie(cookie, baseUrl)

        return request({
          url: punchesUrl,
          jar: cookieJar,
          timeout: DEFAULT_REQUEST_TIMEOUT
        }).then(scrape).then(compute)
      })
    } catch (e) {
      throw e
    }
  }

  recalculate (historyPayload, dates = []) {
    const strDates = dates.map(({ date }) => date)

    historyPayload.monthPunches.forEach(entry => {
      if (strDates.indexOf(entry.date) === 0) {
        entry.punches = dates.find(e => e.date === entry.date).punches
      }
    })

    return compute(historyPayload)
  }

  register (headers, body) {
    headers['Host'] = DEFAULT_SERVICE_HOST

    return post(
      `${this.url}/batidaonline/verifyIdentification`,
      body,
      { timeout: DEFAULT_REQUEST_TIMEOUT, headers }
    ).then(response => response.data)
  }

  punchIsValid (punches = [], newPunch = null) {
    const lastPunch = moment(punches[punches.length - 1], 'HH:mm')

    return moment(newPunch, 'HH:mm')
      .diff(lastPunch, 'minutes') >= DUPLICATE_TOLERANCE
  }
}
