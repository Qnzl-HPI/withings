#!/usr/bin/node env

const { URLSearchParams } = require('url')
const { promisify } = require('util')
const fetch = require('node-fetch')
const { Command } = require('commander')
const fs = require('fs')
const dayjs = require('dayjs')
const { resolve } = require('path')
const server = require('server')

const program = new Command()

const { get } = server.router
const { send, status } = server.reply

const measurementKeys = {
  weight: 1,
  height: 4,
  fatFreeMass: 5,
  fatRatio: 6,
  fatMassWeight: 8,
  temperature: 12,
  sp02: 54,
  bodyTemperature: 71,
  skinTemperature: 73,
  muscleMass: 76,
  hydration: 77,
  boneMass: 88,
  pulseWaveVelocity: 91
}


process.on('unhandledRejection', onfatal)
process.on('uncaughtException', onfatal)

function onfatal(err) {
  console.log('fatal:', err.message)
  exit(1)
}

function exit(code) {
  process.nextTick(process.exit, code)
}

program
  .command('url')
  .description('Get OAuth first step URL')
  .option('--client-id [id]', 'Client ID')
  .option('--redirect-url [url]', 'OAuth redirect URL')
  .action(getOAuthUrl)

program
  .command('exchange-token')
  .description('Exchange OAuth2 code for access token')
  .option('--port [port]', 'Server port', 3000)
  .option('--client-id [id]', 'Client ID')
  .option('--client-secret [secret]', 'Client secret')
  .option('--redirect-url [url]', 'OAuth redirect URL')
  .action(exchangeToken)

program
  .command('refresh-token')
  .description('Refresh access token')
  .option('--client-id [id]', 'Client ID')
  .option('--client-secret [secret]', 'Client secret')
  .option('--access-token [acccesToken]', 'OAuth access token')
  .option('--refresh-token [refreshToken]', 'OAuth refresh token')
  .action(refreshToken)


program
  .command('dump')
  .description('Dump to file')
  .option('-t, --token [token]', 'OAuth access token')
  .option('--export-format <format>', 'Export file format', '{date}-todoist.json')
  .option('--export-path [path]', 'Export file path')
  .action(dump)

program.parseAsync(process.argv)

function getOAuthUrl({
  clientId,
  redirectUrl,
}) {
  const nonce = Number(new Date())

  const scopes = `user.info,user.metrics,user.activity,user.sleepevents`

  process.stdout.write(`https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${nonce}&scope=${scopes}&redirect_uri=${redirectUrl}`)
}

async function exchangeToken({
  port,
  clientId,
  clientSecret,
  redirectUrl,
}) {
  console.log(`Waiting to exchange token at ${redirectUrl} on port ${port}...`)

  return new Promise((resolve, reject) => {
    server({ port: Number(port) }, [
      get('/', async ctx => {
        console.log('Received exchange token request...')
        const code = ctx.query.code

        const body = new URLSearchParams()

        body.append('code', code)
        body.append('grant_type', 'authorization_code')
        body.append('client_id', clientId)
        body.append('client_secret', clientSecret)
        body.append('redirect_uri', redirectUrl)

        try {
          const res = await fetch(`https://account.withings.com/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body
          })

          const {
            refresh_token,
            access_token,
            expires_in,
          } = await res.json()

          process.stdout.write(`${access_token},${refresh_token},${expires_in}`)

          return process.exit(0)
        } catch (e) {
          return onfatal(e)
        }
      })
    ])
  })
}

async function refreshToken({
  clientSecret,
  refreshToken,
  clientId,
}) {
  console.log('Received exchange token request...')
  const body = new URLSearchParams()

  body.append('client_id', clientId)
  body.append('action', 'requesttoken')
  body.append('refresh_token', refreshToken)
  body.append('client_secret', clientSecret)
  body.append('grant_type', 'refresh_token')

  try {
    const res = await fetch(`https://account.withings.com/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body
    })

    const {
      refresh_token,
      access_token,
      expires_in,
    } = await res.json()

    process.stdout.write(`${access_token},${refresh_token},${expires_in}`)

    return process.exit(0)
  } catch (e) {
    return onfatal(e)
  }
}

async function dump({
  token,
  exportPath,
  exportFormat
}) {
  let measurements
  let activities

  const filledExportFormat = exportFormat
    .replace('{date}', dayjs().format('YYYY-MM-DD'))

  const EXPORT_PATH = resolve(exportPath, filledExportFormat)

  try {
    const measurementResults = Object.keys(measurementKeys).map(async (name) => {
      const response = await fetch(`https://wbsapi.withings.net/measure?action=getmeas&meastype=${measurementKeys[name]}&category=1`, {
          method: `GET`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

      const { body: { measuregrps } } = await response.json()

      return { [name]: measuregrps }
    })

    measurements = await Promise.all(measurementResults)

    // TODO Refresh token if failed
    const activityResponse = await fetch(`https://wbsapi.withings.net/v2/measure?action=getintradayactivity&startdate=${dayjs().startOf(`day`).unix()}&enddate=${dayjs().endOf(`day`).unix()}`, {
        method: `GET`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

    const { body } = await activityResponse.json()

    activities = body.activities
  } catch (e) {
    onfatal(e)
  }

  const dump = JSON.stringify({ measurements, activities })

  await promisify(fs.writeFile)(EXPORT_PATH, dump)
}
