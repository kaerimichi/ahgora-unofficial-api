const moment = require('moment-timezone')
const { CALCULATE_MONTH_BALANCE = '1', WORKSHIFT = '8' } = process.env
const { compute: computeWithZsg } = require('zaman-statistics-generator')

require('moment-duration-format')

function getWorkTime (punches = [], live = true) {
  const momentPunches = punches.map(punch => {
    const [ hour, minute ] = punch.split(':')
    const timeObject = {
      hours: parseInt(hour),
      minutes: parseInt(minute)
    }

    return moment.duration(timeObject).asMinutes()
  })
  const workMinutes = momentPunches.reduce((acc, punch, index) => {
    let currentMinutes = moment.duration(moment().format('HH:mm')).asMinutes()

    if (index % 2 !== 0) {
      acc += momentPunches[index] - momentPunches[index - 1]
    } else {
      if (index === momentPunches.length - 1 && live) {
        acc += currentMinutes - momentPunches[index]
      }
    }

    return acc
  }, 0)

  return moment.duration({ minutes: workMinutes }).asMinutes()
}

function getStringTime (minutes = 0, allowNegative = false) {
  if (!allowNegative && minutes <= 0) {
    return '00:00'
  }

  return moment.duration({ minutes }).format('HH:mm', { trim: false })
}

function compute (content) {
  const {
    userInfo,
    overallInfo,
    liveBalance,
    monthPunches
  } = content
  const getDuration = stringTime => {
    return Math.abs(
      moment.duration(stringTime).asMinutes()
    )
  }
  const hourBank = Boolean(parseInt(CALCULATE_MONTH_BALANCE))
    ? getDuration(overallInfo.horasMensaisPositivas) - getDuration(overallInfo.horasMensaisNegativas)
    : getDuration(overallInfo.saldo)
  const statistics = computeWithZsg(monthPunches, parseInt(WORKSHIFT), hourBank)

  return {
    userInfo,
    overallInfo,
    liveBalance,
    monthPunches,
    statistics,
    hourBank
  }
}

module.exports = { compute, getWorkTime, getStringTime }
