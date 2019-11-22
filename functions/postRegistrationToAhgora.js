const LAYERS_ROOT = process.env.LAYERS_ROOT || '/opt/'
const AhgoraIntegration = require(`${LAYERS_ROOT}services/AhgoraIntegration`)
const moment = require(`${LAYERS_ROOT}node_modules/moment-timezone`)

moment.tz.setDefault('America/Sao_Paulo')

function parseErrorMessage (error) {
  try {
    const errorObject = JSON.parse(error.error)

    return `Service message: ${errorObject.message} (${errorObject.code})`
  } catch (e) {
    return error.message || 'Unknown error!'
  }
}

exports.handler = async event => {
  try {
    const currentDate = moment().format('YYYY-MM-DD')
    const ahgoraIntegration = new AhgoraIntegration(
      process.env.SERVICE_URL,
      event.headers['Authorization'],
      event.pathParameters.identity
    )
    const historyContent = await ahgoraIntegration.getHistory()

    if (!historyContent.userInfo.registry) {
      throw new Error('Não foi possível validar a batida.')
    }

    const currentPunch = moment().format('HH:mm')
    let dayPunches = historyContent.monthPunches
      .find(e => e.date === currentDate).punches

    if (!dayPunches) dayPunches = []
    if (dayPunches.length > 0 && !ahgoraIntegration.punchIsValid(dayPunches, currentPunch)) {
      throw new Error('Batida duplicada na tolerância.')
    }

    const registrationData = await ahgoraIntegration.register(
      event.headers,
      event.body
    )

    if (!registrationData.result) {
      throw new Error(`Erro no registro: ${registrationData.reason}`)
    }

    const { statistics, monthPunches } = await ahgoraIntegration.getHistory(
      historyContent.knownToken
    )

    return {
      isBase64Encoded: false,
      headers: null,
      statusCode: 200,
      body: JSON.stringify({
        punches: monthPunches.find(({ date }) => date === currentDate).punches || [],
        statistics
      })
    }
  } catch (e) {
    return {
      isBase64Encoded: false,
      headers: null,
      statusCode: 500,
      body: JSON.stringify({
        message: parseErrorMessage(e)
      })
    }
  }
}
