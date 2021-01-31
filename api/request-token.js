const authCheck = require(`./_lib/auth`)
const moment = require(`moment`)
const fetch = require(`node-fetch`)
const auth = require(`@qnzl/auth`)

const { CLAIMS } = auth

const {
  WITHINGS_CLIENT_ID,
  WITHINGS_REDIRECT_URI,
} = process.env

const handler = async (req, res) => {
  const {
    projectId = ''
  } = req.query

  console.log("VALUE:", WITHINGS_REDIRECT_URI)
  const scopes = `user.info,user.metrics,user.activity,user.sleepevents`

  const requestUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${WITHINGS_CLIENT_ID}&state=${moment().valueOf()}&scope=${scopes}&redirect_uri=${WITHINGS_REDIRECT_URI}`

  return res.send(requestUrl)
}

module.exports = (req, res) => {
  return authCheck(CLAIMS.withings.dump)(req, res, handler)
}

