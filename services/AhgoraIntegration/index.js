const moment = require('moment-timezone')
const atob = require('atob')
const axios = require('axios')
const { transform } = require('./helpers/PayloadProcessor')
const { compute, getStringTime } = require('./helpers/TimeComputation')
const { capture } = require('./helpers/CaptureAgent')
const timezone = process.env.TZ || 'America/Sao_Paulo'
const DEFAULT_SERVICE_HOST = 'www.ahgora.com.br'
const DUPLICATE_TOLERANCE = 5
const REGISTRATION_TIMEOUT = 6000

moment.tz.setDefault(timezone)

module.exports = class AhgoraIntegration {
  constructor (url, basicAuthHash, companyId) {
    this.basicAuthHash = basicAuthHash
    this.companyId = companyId
    this.ahgoraClient = axios.create({
      baseURL: url || `https://${DEFAULT_SERVICE_HOST}`,
      timeout: 8000
    })
  }

  async getHistory (knownToken = null, period = moment().format('MM-YYYY'), live = true) {
    try {
      const [ username, password ] = atob(this.basicAuthHash.split(' ')[1]).split(':')
      const [ month, year ] = period.split('-')
      const punchesEndpoint = `api-espelho/apuracao/${year}-${month}`
      const loginEndpoint = 'externo/login'
      let token = knownToken

      if (!token) {
        const form = { empresa: this.companyId, matricula: username, senha: password }
        const { data } = await this.ahgoraClient.post(loginEndpoint, form)

        token = data.jwt
      }

      return this.ahgoraClient.get(punchesEndpoint, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(({ data }) => {
          data.COMPUTE_LIVE_RESULTS = live

          return data
        })
        .then(capture)
        .then(transform)
        .then(compute)
        .then(capture)
        .then(response => { response.token = token; return response })
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

    return this.ahgoraClient.post(
      'batidaonline/verifyIdentification',
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
