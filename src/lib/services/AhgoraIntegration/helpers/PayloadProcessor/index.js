const moment = require('moment')
const slugify = require('slugify')
const { camelCase } = require('lodash')
const { getWorkTime, getStringTime } = require('../TimeComputation')

function getWeekDay (weekDayNumber) {
  const names = {
    0: 'domingo',
    1: 'segunda-feira',
    2: 'terça-feira',
    3: 'quarta-feira',
    4: 'quinta-feira',
    5: 'sexta-feira',
    6: 'sábado'
  }

  return names[weekDayNumber]
}

function getOverallInfo (reference) {
  return reference.totais.reduce((prev, entry) => {
    prev[slugify(camelCase(entry.descricao))] = entry.valor

    return prev
  }, {})
}

function transform (payload) {
  const { funcionario, dias, meses } = JSON.parse(payload)

  return Promise.resolve({
    userInfo: {
      registry: funcionario.matricula,
      name: funcionario.nome,
      position: funcionario.cargo
    },
    overallInfo: getOverallInfo(
      Object.keys(meses).map(ref => meses[ref]).find(({ totais }) => totais.length)
    ),
    monthPunches: Object.keys(dias).map(date => {
      const momentDate = moment(date, 'YYYY-MM-DD')
      const dayNumber = parseInt(momentDate.format('e'))
      let punches = dias[date].batidas.map(({ hora }) => hora)

      punches = punches.length && moment().isSameOrAfter(momentDate)
        ? punches.filter(e => e.length)
        : null

      return {
        date,
        punches,
        weekDay: dayNumber,
        weekDayAsText: getWeekDay(dayNumber),
        timeWorked: punches
          ? getStringTime(getWorkTime(punches))
          : null,
        holiday: dias[date].afastamentos > 0,
        obs: dias[date].afastamentos > 0 && dias[date].totais.length > 0
          ? dias[date].totais.map(e => e.descricao).join(' / ')
          : null
      }
    })
  })
}

module.exports = { transform }
