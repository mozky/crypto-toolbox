import ftx from 'ftx-api'

export default class FTX {
  constructor(apiKey, apiSecret) {
    const { RestClient } = ftx
    this.restClient = new RestClient(apiKey, apiSecret)
  }

  async getUSDBalance() {
    const { result: balances } = await this.restClient.getBalances()
    const balance = balances.reduce((acc, curr) => {
      return acc + curr.usdValue
    }, 0)

    return Number(Number(balance).toFixed(2))
  }
}
