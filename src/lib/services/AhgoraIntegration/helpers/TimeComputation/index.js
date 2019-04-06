const moment = require('moment-timezone')
const { last } = require('lodash')

require('moment-duration-format')

function getWeekDays () {
  const startOfWeek = moment().startOf('week')
  const endOfWeek = moment().endOf('week')
  let days = []
  let day = startOfWeek

  while (day <= endOfWeek) {
    days.push(day.toDate())
    day = day.clone().add(1, 'd')
  }

  return days
    .filter(date => ['0', '6'].indexOf(moment(date).format('e')) < 0)
    .map(date => moment(date).format('YYYY-MM-DD'))
}

function getWeekPunches (monthPunches, emptyPunches = false, onlyWorkDays = false) {
  const weekDays = getWeekDays()

  return monthPunches
    .filter(entry => {
      if (onlyWorkDays) {
        return weekDays.indexOf(entry.date) > -1 && !entry.holiday
      }

      if (emptyPunches) {
        return weekDays.indexOf(entry.date) > -1
      }

      return weekDays.indexOf(entry.date) > -1 && entry.punches
    })
}
function getWeekTotalMinutes (weekPunches) {
  const weekHours = weekPunches.reduce((acc, entry) => {
    if (!entry.holiday) acc = acc + 8
    return acc
  }, 0)

  return moment.duration({ hours: weekHours }).asMinutes()
}

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

function compute (scrapedContent) {
  const { overallInfo } = scrapedContent
  let totalWeekMinutes
  let weekMinutes
  let weekPunches
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes

  dayPunches = getWeekPunches(scrapedContent.monthPunches)
    .filter(({ date }) => date === moment().format('YYYY-MM-DD'))
    .map(({ punches }) => punches)[0]
  weekPunches = getWeekPunches(scrapedContent.monthPunches).map(({ punches }) => punches)
  totalWeekMinutes = getWeekTotalMinutes(getWeekPunches(scrapedContent.monthPunches, true))
  weekMinutes = getWeekMinutes(weekPunches)
  dayMinutes = getDayBalance(dayPunches)
  remainingOfTodayAsMinutes = 480 - dayMinutes < 0 ? 0 : 480 - dayMinutes

  scrapedContent.statistics = {
    serverTime: moment().format('HH:mm:ss'),
    dayBalance: {
      completed: {
        asMinutes: dayMinutes,
        asShortTime: getStringTime(dayMinutes)
      },
      remaining: {
        asMinutes: remainingOfTodayAsMinutes,
        asShortTime: getStringTime(remainingOfTodayAsMinutes)
      },
      extra: {
        asMinutes: dayMinutes > 480 ? dayMinutes - 480 : null,
        asShortTime: dayMinutes > 480 ? getStringTime(dayMinutes - 480) : null
      }
    },
    weekBalance: {
      total: {
        asMinutes: totalWeekMinutes,
        asShortTime: getStringTime(totalWeekMinutes)
      },
      completed: {
        asMinutes: weekMinutes,
        asShortTime: getStringTime(weekMinutes)
      },
      remaining: {
        asMinutes: totalWeekMinutes - weekMinutes,
        asShortTime: getStringTime(totalWeekMinutes - weekMinutes)
      },
      extra: {
        asMinutes: weekMinutes < 0 ? Math.abs(weekMinutes) : null,
        asShortTime: weekMinutes < 0 ? getStringTime(Math.abs(weekMinutes)) : null
      }
    },
    monthBalance: {
      completed: {
        asMinutes: moment.duration(overallInfo.horasTrabalhadas).asMinutes(),
        asShortTime: overallInfo.horasTrabalhadas
      },
      extra: overallInfo.horaExtra65 || overallInfo.falta
        ? overallInfo.horaExtra65
          ? {
            asMinutes: moment.duration(overallInfo.horaExtra65).asMinutes(),
            asShortTime: overallInfo.horaExtra65,
            isPositive: true
          }
          : {
            asMinutes: moment.duration(overallInfo.falta).asMinutes(),
            asShortTime: overallInfo.falta.replace('-', ''),
            isPositive: false
          }
        : { asMinutes: 0, asShortTime: '00:00', isPositive: null }
    }
  }

  return scrapedContent
}

module.exports = { compute, getWorkTime, getStringTime }
