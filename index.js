const Koa = require('koa')
const mount = require('koa-mount')
const app = new Koa()
const port = process.env.PORT || 8080

app.use(mount('/history', require('./src/modules/history')))
app.use(mount('/registration', require('./src/modules/registration')))

app.listen(port)
