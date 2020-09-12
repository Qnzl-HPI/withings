const authCheck = require(`./_lib/auth`)
const moment = require(`moment`)
const fetch = require(`node-fetch`)
const auth = require(`@qnzl/auth`)

const { CLAIMS } = auth

const clientId = process.env.WITHINGS_CLIENT_ID

const handler = async (req, res) => {
  const {
    projectId = ''
  } = req.query

  const scopes = `user.info,user.metrics,user.activity,user.sleepevents`
  const redirectUri = `${process.env.WITHINGS_REDIRECT_URI}/api/request-token`

  const requestUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${moment().valueOf()}&scope=${scopes}&redirect_uri=${redirectUri}`

  return res.send(requestUrl)
}

module.exports = (req, res) => {
  return authCheck(CLAIMS.withings.dump)(req, res, handler)
}

