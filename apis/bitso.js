import crypto from 'crypto'
import { listenerCount } from 'events'
import http from 'https'

class Bitso {
  constructor(key, secret) {
    this.apiKey = key
    this.apiSecret = secret
    this.host = 'api.bitso.com'
  }

  makeRequest(request_path, http_method, query_params = {}, json_payload = {}) {
    return new Promise((resolve, reject) => {
      const nonce = new Date().getTime()
      const message = nonce + http_method + request_path
      const payload = JSON.stringify(json_payload)

      if (http_method == "POST")
        message += payload

      const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');

      // Build the auth header
      const auth_header = "Bitso "+this.apiKey+":" +nonce+":"+signature

      const url = new URL('https://' + this.host + request_path)
      const params = new URLSearchParams()
      Object.entries(query_params).map(([ k, v ]) => {
        params.append(k,v)
      })
      url.search = params

      // Send request
      const options = {
        host: this.host,
        path: request_path + url.search,
        method: http_method,
        headers: {
          'Authorization': auth_header,
          'Content-Type': 'application/json'
        }
      }

      // Send request
      let data = ''
      const req = http.request(options, function(res) {
        //console.log(`statusCode: ${res.statusCode}`)
        //console.log(`statusMessage: ${res.statusMessage}`)
        res.on('data', function (chunk) {
          data += chunk
        });
        res.on('end', () => {
          const dataObj = JSON.parse(data)
          if (dataObj.success) {
            resolve(dataObj.payload)
          } else {
            reject(res.statusCode)
          }
        })
      });
      req.on('error', (error) => {
        console.error(error)
        reject(error)
      })

      if (http_method == "POST") {
        req.write(payload)
      }
      req.end()
    })
  }

  async getAllBalances() {
    const { balances } = await this.makeRequest('/v3/balance/', 'GET')

    const coinsMap = balances.reduce((acc, curr) => {
      if (curr.total > 0) {
        acc[curr.currency] = { amount: curr.total }
      }

      return acc
    }, {})

    const pricePromises = Object.keys(coinsMap).map(async c => {
      switch (c) {
        case 'ltc':
          return { coin: c, price: 165 }
        case 'tusd':
          return { coin: c, price: 1 }
        case 'mxn':
          const { last: usdMxn } =  await this.makeRequest('/v3/ticker/', 'GET', { book: `tusd_${c}` })

          return { coin: c, price: 1 / usdMxn}
        default:
          const { last } =  await this.makeRequest('/v3/ticker/', 'GET', { book: `${c}_usd` })

          return { coin: c, price: last}
      }
    })

    const prices = await Promise.allSettled(pricePromises)

    prices.forEach(p => {
      coinsMap[p.value.coin].usd_value = coinsMap[p.value.coin].amount * p.value.price 
    })

    coinsMap.total_usd = Object.values(coinsMap).reduce((acc, curr) => {
      return acc + curr.usd_value
    }, 0)

    return coinsMap
  }

  async getUSDBalance() {
    const { total_usd } = await this.getAllBalances()

    return Number(Number(total_usd).toFixed(2))
  }
}

export default Bitso