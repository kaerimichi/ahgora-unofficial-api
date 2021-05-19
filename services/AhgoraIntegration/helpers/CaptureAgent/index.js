const https = require('https')
const {
  CAP_ENABLED = '0',
  CAP_HOST = '',
  CAP_PORT = '443',
  CAP_ENDPOINT = '/',
  CAP_TIMEOUT = '1000'
} = process.env

function capture (subject) {
  try {
    const data = JSON.stringify(subject)
    const options = {
      hostname: CAP_HOST,
      port: parseInt(CAP_PORT),
      path: CAP_ENDPOINT,
      method: 'POST',
      timeout: parseInt(CAP_TIMEOUT),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    return new Promise(resolve => {
      let req

      if (!Boolean(parseInt(CAP_ENABLED))) {
        return resolve(subject)
      }

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
