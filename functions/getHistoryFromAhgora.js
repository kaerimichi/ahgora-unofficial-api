const LAYERS_ROOT = process.env.LAYERS_ROOT || '/opt/'
const AhgoraIntegration = require(`${LAYERS_ROOT}services/AhgoraIntegration`)
const moment = require(`${LAYERS_ROOT}node_modules/moment-timezone`)

moment.tz.setDefault('America/Sao_Paulo')

exports.handler = async event => {
  const ahgoraIntegration = new AhgoraIntegration(
    process.env.SERVICE_URL,
    event.headers['Authorization'],
    event.pathParameters.identity
  )
  const result = await ahgoraIntegration.getHistory(
    null,
    event.pathParameters.period,
    event.queryStringParameters
      ? Boolean(parseInt(event.queryStringParameters.live))
      : false
  )

  return {
    isBase64Encoded: false,
    headers: null,
    statusCode: 200,
    body: JSON.stringify(result)
  }
}
