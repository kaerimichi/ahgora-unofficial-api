const atob = require('atob')
const request = require('request-promise-native')

async function getBody (auth, account, period) {
  const [ username, password ] = atob(auth.split(' ')[1]).split(':')
  const baseUrl = process.env.SERVICE_URL || 'https://www.ahgora.com.br'
  const punchesUrl = `${baseUrl}/externo/batidas/${period}`
  const loginUrl = `${baseUrl}/externo/login`
  const loginPayload = { empresa: account, matricula: username, senha: password }
  const loginResponse = await request({ url: loginUrl, method: 'POST', form: loginPayload, resolveWithFullResponse: true })
  const authCookie = loginResponse.headers['set-cookie'][0]
  const cookie = request.cookie(authCookie)
  const cookieJar = request.jar()

  cookieJar.setCookie(cookie, baseUrl)

  return request({ url: punchesUrl, jar: cookieJar })
}

module.exports = { getBody }
