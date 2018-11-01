const Koa = require('koa')
const mount = require('koa-mount')
const app = new Koa()
const port = process.env.PORT || 8080
const moment = require('moment-timezone')
const timezone = process.env.TZ || 'America/Sao_Paulo'

moment.tz.setDefault(timezone)

app.use(mount('/history', require('./src/modules/history')))
app.use(mount('/registration', require('./src/modules/registration')))

console.log(`App is running at port ${port}...`)

app.listen(port)
