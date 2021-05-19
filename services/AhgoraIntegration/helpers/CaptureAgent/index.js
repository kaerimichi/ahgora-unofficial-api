const https = require('https')
const {
  CAP_ENABLED = true,
  CAP_HOST = '',
  CAP_PORT = 443,
  CAP_ENDPOINT = '/',
  CAP_TIMEOUT = 1000
} = process.env

function capture (subject) {
  try {
    const data = JSON.stringify(subject)
    const options = {
      hostname: CAP_HOST,
      port: CAP_PORT,
      path: CAP_ENDPOINT,
      method: 'POST',
      timeout: CAP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    return new Promise(resolve => {
      let req

      if (!CAP_ENABLED) return resolve(subject)

      req = https.request(options, res => {
        res.on('data', () => {
          return resolve(subject)
        })
      })

      req.on('error', () => {
        return resolve(subject)
      })

      req.on('timeout', () => {
        req.abort()
        return resolve(subject)
      })

      req.write(data)
      req.end()
    })
  } catch (error) {
    return subject
  }
}

module.exports = { capture }
