import binance from '@binance/connector'

export default class Binance {
  constructor(apiKey, apiSecret) {
    const { Spot } = binance
    this.spotClient = new Spot(apiKey, apiSecret)
  }

  async getUSDBalance() {
    const { data } = await this.spotClient.accountSnapshot('SPOT') // I dont really trust this method
    const { data: { price: btcPrice } } = await this.spotClient.avgPrice('BTCUSDT')

    const [ lastSnapshot ] = data.snapshotVos.sort((a, b) => a.updateTime < b.updateTime ? 1 : -1)

    const total_usd = lastSnapshot.data.totalAssetOfBtc * btcPrice 

    return Number(Number(total_usd).toFixed(2))
  }
}
