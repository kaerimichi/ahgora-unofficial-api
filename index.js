const [ , , ...params ] = process.argv
const [ functionName, options ] = params
const functionInput = JSON.parse(options);

(async () => {
  try {
    const functionOutput = await require(`./functions/${functionName}`)
      .handler(functionInput)

    process.stdout.write(functionOutput + '\n')
  } catch (error) {
    process.stderr.write(error.message + '\n')
  }
})()
