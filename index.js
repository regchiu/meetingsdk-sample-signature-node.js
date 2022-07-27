require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const cors = require('cors')
const KJUR = require('jsrsasign')
const axios = require('axios').default

const app = express()
const port = process.env.PORT || 4000

app.use(bodyParser.json(), cors())
app.options('*', cors())

app.get('/', async (req, res) => {
  res.redirect(
    'https://zoom.us/oauth/authorize?response_type=code&client_id=' +
      process.env.ZOOM_OAUTH_CLIENT_ID +
      '&redirect_uri=' +
      process.env.ZOOM_OAUTH_REDIRECT_URL
  )
})

app.post('/signature', (req, res) => {
  const iat = Math.round(new Date().getTime() / 1000) - 30
  const exp = iat + 60 * 60 * 2

  const oHeader = { alg: 'HS256', typ: 'JWT' }

  const oPayload = {
    sdkKey: process.env.ZOOM_SDK_KEY,
    mn: req.body.meetingNumber,
    role: req.body.role,
    iat: iat,
    exp: exp,
    appKey: process.env.ZOOM_SDK_KEY,
    tokenExp: iat + 60 * 60 * 2,
  }

  const sHeader = JSON.stringify(oHeader)
  const sPayload = JSON.stringify(oPayload)
  const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_SDK_SECRET)

  res.json({
    signature: signature,
  })
})

app.get('/access-token', async (req, res) => {
  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      {},
      {
        params: {
          grant_type: 'authorization_code',
          code: req.query.code,
          redirect_uri: process.env.ZOOM_OAUTH_REDIRECT_URL,
        },
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              process.env.ZOOM_OAUTH_CLIENT_ID + ':' + process.env.ZOOM_OAUTH_CLIENT_SECRET
            ).toString('base64'),
        },
      }
    )
    res.json(response.data)
  } catch (error) {
    res.json(error)
  }
})

app.get('/refresh-access-token', async (req, res) => {
  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      {},
      {
        params: {
          grant_type: 'refresh_token',
          refresh_token: req.query.refreshToken,
        },
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              process.env.ZOOM_OAUTH_CLIENT_ID + ':' + process.env.ZOOM_OAUTH_CLIENT_SECRET
            ).toString('base64'),
        },
      }
    )
    res.json(response.data)
  } catch (error) {
    res.json(error)
  }
})

app.get('/zak', async (req, res) => {
  try {
    const response = await axios.get('https://api.zoom.us/v2/users/me/zak', {
      headers: {
        Authorization: `Bearer ${req.query.accessToken}`,
      },
    })
    res.json(response.data)
  } catch (error) {
    return error
  }
})

app.listen(port, () =>
  console.log(`Zoom Meeting SDK Sample Signature Node.js on port http://localhost:${port}`)
)
