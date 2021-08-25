import crypto from 'crypto'
import http from 'https'

class Huobi {
  constructor({ apiKey, secret }) {
    this.apiKey = apiKey
    this.apiSecret = secret
  }

  makeRequest(request_path, http_method, extra_params) {
    return new Promise((resolve, reject) => {
      const host = 'api.huobi.pro'
      const accessKeyParam = `AccessKeyId=${encodeURIComponent(this.apiKey)}`
      const signatureVersionParam = 'SignatureVersion=2'
      const signatureMethodParam = `SignatureMethod=${encodeURIComponent('HmacSHA256')}`
      const timestampParam = `Timestamp=${encodeURIComponent(new Date().toISOString().replace(/.\d+Z$/g, ""))}`

      const parameters = [accessKeyParam, signatureVersionParam, signatureMethodParam, timestampParam].concat(extra_params).sort()
      const concatParameters = parameters.join('&')

      const message = http_method + '\n' + host + '\n' + request_path + '\n' + concatParameters

      const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64')
      const signatureParam = `Signature=${encodeURIComponent(signature)}`

      const url = request_path + '?' + parameters.concat(signatureParam).join('&') 

      // Send request
      const options = {
        host,
        path: url,
        method: http_method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      // Send request
      let response = ''
      const req = http.request(options, function(res) {
        //console.log(`statusCode: ${res.statusCode}`)
        //console.log(`statusMessage: ${res.statusMessage}`)
        res.on('data', function (chunk) {
          response += chunk
        });
        res.on('end', () => {
          const responseBody = JSON.parse(response)
          if (res.statusCode === 200 && responseBody.code === 200) {
            resolve(responseBody.data)
          } else {
            reject(res.statusCode)
          }
        })
      });
      req.on('error', (error) => {
        reject(error)
      })

      if (http_method == "POST") {
        req.write(payload)
      }
      req.end()
    })
  }

  async getUSDBalance() {
    const { balance } = await this.makeRequest('/v2/account/asset-valuation', 'GET', ['accountType=spot', 'valuationCurrency=USD'])

    return Number(Number(balance).toFixed(2))
  }
}

export default Huobi