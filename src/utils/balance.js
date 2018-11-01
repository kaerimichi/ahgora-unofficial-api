const moment = require('moment-timezone')

require('moment-duration-format')

function getWorkTime (punches = []) {
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
      if (index === momentPunches.length - 1) {
        acc += currentMinutes - momentPunches[index]
      }
    }

    return acc
  }, 0)

  return moment.duration({ minutes: workMinutes }).asMinutes()
}

function getStringTime (minutes = 0) {
  return minutes > 0
    ? moment.duration({ minutes }).format('HH:mm', { trim: false })
    : '00:00'
}

function getWeekMinutes (weekPunches = []) {
  const weekMinutes = weekPunches.map(getWorkTime).reduce((a, b) => a + b, 0)

  return weekMinutes < 0 ? 0 : weekMinutes
}

function getDayBalance (dayPunches = []) {
  return getWeekMinutes([dayPunches])
}

module.exports = {
  getWorkTime,
  getStringTime,
  getWeekMinutes,
  getDayBalance
}
