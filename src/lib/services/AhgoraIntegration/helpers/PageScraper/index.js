const moment = require('moment-timezone')
const slugify = require('slugify')
const cheerio = require('cheerio')
const { trim, lowerCase, camelCase, has } = require('lodash')
const { getWorkTime, getStringTime } = require('../TimeComputation')

function isHoliday (rawCalculated, overallInfo) {
  let parsedDayInfo = trim(rawCalculated).split(':')[0] ? camelCase(trim(rawCalculated).split(':')[0]) : null
  let nonHolidays = [
    'falta',
    'dsrSemanal',
    'horasTrabalhadas',
    'horasDeSophia',
    'horaExtra65'
  ]

  if (parsedDayInfo && has(overallInfo, parsedDayInfo) && nonHolidays.indexOf(parsedDayInfo) === -1) {
    return true
  }

  return false
}

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

function getUserInfo ($) {
  const userInfo = $('.infoUser h3.text-primary')
    .text().split('\n')
    .map(entry => trim(entry))
    .filter(entry => entry.length > 0)

  return {
    registry: parseInt(userInfo[1]),
    name: userInfo[0],
    position: userInfo[2]
  }
}

function getOverallInfo ($) {
  const $tableInfo = $('#tableTotalize tr')
  const overallInfoLines = $tableInfo.length
  let values = {}

  for (let i = 0; i < overallInfoLines; i++) {
    let slug = slugify(
      trim(lowerCase($tableInfo.eq(i).find('td').eq(0).html()))
    )

    if (camelCase(slug) === 'fXE9Rias') {
      values['ferias'] = trim($tableInfo.eq(i).find('td').eq(1).html())
    } else {
      values[camelCase(slug)] = trim($tableInfo.eq(i).find('td').eq(1).html())
    }
  }

  return values
}

function getMonthPunches ($, overallInfo) {
  const $table = $('table').last()
  const punchLines = $table.find('tr').length
  let values = []

  for (let i = 0; i < punchLines; i++) {
    const parsedDate = $table.find('tbody tr').eq(i).find('span').data('datedb')
    let rawCalculated
    let parsedPunches
    let rawPunches
    let weekDay

    if (!parsedDate || parsedDate.split('-').length === 1) continue

    rawPunches = $table.find('tbody tr').eq(i).find('td').eq(2).html()
    rawCalculated = $table.find('tbody tr').eq(i).find('td').eq(6).html()

    weekDay = parseInt(moment(parsedDate, 'MM-DD').format('e'))
    parsedPunches = trim(rawPunches).length > 0
      ? trim(rawPunches).split(',').map(trim)
      : null

    let item = {
      date: parsedDate,
      weekDay,
      weekDayAsText: getWeekDay(weekDay),
      punches: parsedPunches,
      timeWorked: parsedPunches
        ? getStringTime(getWorkTime(parsedPunches))
        : null,
      holiday: isHoliday(rawCalculated, overallInfo),
      obs: $table.find('tbody tr').eq(i).hasClass('warning')
    }

    if (item.date.length > 0) values.push(item)
  }

  return values
}

function scrape (body) {
  const $ = cheerio.load(body)
  let userInfo = getUserInfo($)
  let overallInfo = getOverallInfo($)
  let monthPunches = getMonthPunches($, overallInfo)

  return Promise.resolve({ userInfo, monthPunches })
}

module.exports = { scrape }
