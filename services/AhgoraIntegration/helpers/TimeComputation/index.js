const moment = require('moment-timezone')

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

function getWeekMinutes (weekPunches = [], live = true) {
  const weekMinutes = weekPunches
    .map(entry => getWorkTime(entry, live))
    .reduce((a, b) => a + b, 0)

  return weekMinutes < 0 ? 0 : weekMinutes
}

function getDayBalance (dayPunches = [], live = true) {
  return getWeekMinutes([dayPunches], live)
}

function compute (content) {
  const { overallInfo, liveBalance } = content
  const hourBankExists = Boolean(overallInfo.saldo)
  const getDuration = stringTime => {
    return Math.abs(
      moment.duration(stringTime).asMinutes()
    )
  }
  let totalWeekMinutes
  let weekMinutes
  let weekPunches
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes
  let hourBank

  dayPunches = getWeekPunches(content.monthPunches)
    .filter(({ date }) => date === moment().format('YYYY-MM-DD'))
    .map(({ punches }) => punches)[0]
  weekPunches = getWeekPunches(content.monthPunches).map(({ punches }) => punches)
  totalWeekMinutes = getWeekTotalMinutes(getWeekPunches(content.monthPunches, true))
  weekMinutes = getWeekMinutes(weekPunches, liveBalance)
  dayMinutes = getDayBalance(dayPunches, liveBalance)
  remainingOfTodayAsMinutes = 480 - dayMinutes < 0 ? 0 : 480 - dayMinutes
  hourBank = getDuration(overallInfo.saldo)

  content.statistics = {
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
      extra: hourBankExists
        ? {
          asMinutes: hourBank,
          asShortTime: getStringTime(hourBank, true).replace('-', ''),
          isPositive: !overallInfo.saldo.includes('-')
        }
        : {
          asMinutes: 0,
          asShortTime: '00:00',
          isPositive: null
        }
    }
  }

  return content
}

module.exports = { compute, getWorkTime, getStringTime }
