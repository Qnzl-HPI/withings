const moment = require(`moment`)
const fetch = require(`node-fetch`)
const auth = require(`@qnzl/auth`)

const { CLAIMS } = auth

const clientId = process.env.WITHINGS_CLIENT_ID

module.exports = async (req, res) => {
  const {
    authorization
  } = req.headers

  if (!authorization) {
    return res.status(402).send()
  }

  const {
    projectId = ''
  } = req.query

  const isTokenValid = auth.checkJWT(authorization, CLAIMS.todoist.dump, `watchers`, process.env.ISSUER)

  if (!isTokenValid) {
    return res.status(401).send()
  }

  const scopes = `user.info,user.metrics,user.activity,user.sleepevents`
  const redirectUri = `${process.env.WITHINGS_REDIRECT_URI}/api/request-token`

  const requestUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${moment().valueOf()}&scope=${scopes}&redirect_uri=${redirectUri}`

  return res.send(requestUrl)
}

