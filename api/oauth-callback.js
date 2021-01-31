const { URLSearchParams } = require(`url`)
const fetch = require(`node-fetch`)

module.exports = async (req, res) => {
  const { code } = req.query

  const body = new URLSearchParams()
  body.append(`code`, code)
  body.append(`grant_type`, `authorization_code`)
  body.append(`client_id`, process.env.WITHINGS_CLIENT_ID)
  body.append(`client_secret`, process.env.WITHINGS_CLIENT_SECRET)
  body.append(`redirect_uri`, `${process.env.WITHINGS_REDIRECT_URI}`)

  fetch(`https://account.withings.com/oauth2/token`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/x-www-form-urlencoded; charset=UTF-8`
      },
      body
    })
    .then(async (response) => {
      const token = await response.json()

      // TODO Do something with the token
      console.log(`got withings token: ${token}`)

      return res.status(200).send(token)
    })
}
