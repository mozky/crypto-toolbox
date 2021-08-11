import binance from '@binance/connector'

export default class Binance {
  constructor(apiKey, apiSecret) {
    const { Spot } = binance
    this.spotClient = new Spot(apiKey, apiSecret)
  }

  async getUSDBalance() {
    const { data } = await this.spotClient.accountSnapshot('SPOT') // I dont really trust this method
    const { data: { price: btcPrice } } = await this.spotClient.avgPrice('BTCUSDT')

    const total_usd = data.snapshotVos[0].data.totalAssetOfBtc * btcPrice 

    return Number(Number(total_usd).toFixed(2))
  }
}
