const moment = require('moment')
const atob = require('atob')
const request = require('request-promise-native')
const { scrape } = require('./helpers/PageScraper')
const { compute } = require('./helpers/TimeComputation')

module.exports = class AhgoraIntegration {
  constructor (url, basicAuthHash, companyId) {
    this.url = url
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

      return request({ url: loginUrl, method: 'POST', form, resolveWithFullResponse: true }).then(loginResponse => {
        const authCookie = loginResponse.headers['set-cookie'][0]
        const cookie = request.cookie(authCookie)
        const cookieJar = request.jar()

        cookieJar.setCookie(cookie, baseUrl)

        return request({ url: punchesUrl, jar: cookieJar }).then(scrape).then(compute)
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

    return historyPayload
  }
}
