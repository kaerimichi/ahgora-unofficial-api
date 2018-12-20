const moment = require('moment')
const atob = require('atob')
const request = require('request-promise-native')
const { scrape } = require('./helpers/PageScraper')
const { compute } = require('./helpers/TimeComputation')

module.exports = class AhgoraHistoryScraper {
  constructor (url, basicAuthHash, companyId, period = moment().format('MM-YYYY')) {
    this.url = url
    this.basicAuthHash = basicAuthHash
    this.companyId = companyId
    this.period = period
  }

  getPageBody () {
    const [ username, password ] = atob(this.basicAuthHash.split(' ')[1]).split(':')
    const baseUrl = this.url
    const punchesUrl = `${baseUrl}/externo/batidas/${this.period}`
    const loginUrl = `${baseUrl}/externo/login`
    const form = { empresa: this.companyId, matricula: username, senha: password }

    return request({ url: loginUrl, method: 'POST', form, resolveWithFullResponse: true }).then(loginResponse => {
      const authCookie = loginResponse.headers['set-cookie'][0]
      const cookie = request.cookie(authCookie)
      const cookieJar = request.jar()

      cookieJar.setCookie(cookie, baseUrl)

      return request({ url: punchesUrl, jar: cookieJar })
    })
  }

  getContents () {
    try {
      return this.getPageBody().then(scrape).then(compute)
    } catch (e) {
      throw e
    }
  }
}
