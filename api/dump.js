const authCheck = require(`./_lib/auth`)
const moment = require(`moment-timezone`)
const fetch = require(`node-fetch`)
const auth = require(`@qnzl/auth`)

const { CLAIMS } = auth

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

const handler = async (req, res) => {
  const withingsKey = req.headers[`x-withings-access-token`]

  let measurements
  let activities
  try {
    console.log(`getting measurements`)
    const measurementResults = Object.keys(measurementKeys).map(async (name) => {
      const response = await fetch(`https://wbsapi.withings.net/measure?action=getmeas&meastype=${measurementKeys[name]}&category=1`, {
          method: `GET`,
          headers: {
            'Authorization': `Bearer ${withingsKey}`
          }
        })

      const { body: { measuregrps } } = await response.json()

      return { [name]: measuregrps }
    })

    measurements = await Promise.all(measurementResults)


    const activityResponse = await fetch(`https://wbsapi.withings.net/v2/measure?action=getintradayactivity&startdate=${moment().startOf(`day`).unix()}&enddate=${moment().endOf(`day`).unix()}`, {
        method: `GET`,
        headers: {
          'Authorization': `Bearer ${withingsKey}`
        }
      })

    const { body } = await activityResponse.json()

    activities = body.activities
  } catch (e) {
    console.log(`failed to get measurements`, e)

    return res.status(500).send()
  }

  return res.json({ measurements, activities })
}

module.exports = (req, res) => {
  return authCheck(CLAIMS.withings.dump)(req, res, handler)
}
