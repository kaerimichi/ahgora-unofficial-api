const { getStringTime, getWeekMinutes, getDayBalance } = require('../../utils/balance')
const moment = require('moment')
require('moment-duration-format')

const getWeekDays = () => {
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
const getWeekPunches = (monthPunches, includeEmptyPunches = false) => {
  const weekDays = getWeekDays()

  return monthPunches
    .filter(entry => {
      if (includeEmptyPunches) {
        return weekDays.indexOf(entry.date) > -1
      }
      return weekDays.indexOf(entry.date) > -1 && entry.punches
    })
}
const getWeekTotalMinutes = weekPunches => {
  const weekHours = weekPunches.reduce((acc, entry) => {
    if (!entry.holiday) acc = acc + 8
    return acc
  }, 0)

  return moment.duration({ hours: weekHours }).asMinutes()
}

function getContents (scrapedContent) {
  let totalWeekMinutes
  let weekMinutes
  let weekPunches
  let dayPunches
  let dayMinutes

  dayPunches = getWeekPunches(scrapedContent.monthPunches)
    .filter(({ date }) => date === moment().format('YYYY-MM-DD'))
    .map(({ punches }) => punches)[0]
  weekPunches = getWeekPunches(scrapedContent.monthPunches).map(({ punches }) => punches)
  totalWeekMinutes = getWeekTotalMinutes(getWeekPunches(scrapedContent.monthPunches, true))
  weekMinutes = getWeekMinutes(weekPunches)
  dayMinutes = getDayBalance(dayPunches)

  scrapedContent.statistics = {
    dayBalance: {
      completed: {
        asMinutes: dayMinutes,
        asShortTime: getStringTime(dayMinutes)
      },
      remaining: {
        asMinutes: 480 - dayMinutes < 0 ? 0 : 480 - dayMinutes,
        asShortTime: getStringTime(480 - dayMinutes)
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
    }
  }

  return scrapedContent
}

module.exports = { getContents }
