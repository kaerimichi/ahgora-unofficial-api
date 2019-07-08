const Koa = require('koa')
const mount = require('koa-mount')
const app = new Koa()
const port = process.env.PORT || 8080
const moment = require('moment-timezone')
const timezone = process.env.TZ || 'America/Sao_Paulo'
const { HEROKU_PREVENT_SLEEP_URL } = process.env
const HEROKU_PREVENT_SLEEP_INTERVAL = process.env.HEROKU_PREVENT_SLEEP_INTERVAL || 25

moment.tz.setDefault(timezone)

app.use(mount('/history', require('./src/modules/history')))
app.use(mount('/registration', require('./src/modules/registration')))

if (HEROKU_PREVENT_SLEEP_URL && Boolean(HEROKU_PREVENT_SLEEP_URL.length)) {
  const isBedtime = [23, 0, 1, 2, 3, 4, 5]
    .indexOf(parseInt(moment().format('H'))) > -1

  setInterval(() => {
    if (!isBedtime) {
      require('http').get(HEROKU_PREVENT_SLEEP_URL)
    }
  }, HEROKU_PREVENT_SLEEP_INTERVAL * 1000)
}

console.log(`App is running at port ${port}...`)

app.listen(port)
