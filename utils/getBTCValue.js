export default async function getBTCValue(balances, Exchange) {
  if (!await Exchange.has['fetchTickers']) {
    return balances
  }
  balances = addTickerSymbols(balances)
  const tickerSymbols = Object.values(balances).map(b => b.ticker)

  const tickers = await Exchange.fetchTickers(tickerSymbols)

  // console.log(tickers)

  Object.keys(tickers).map(t => {
    const coin = t.substr(0, t.indexOf('/'))
    if (coin === 'BTC') {
      balances[coin] = { ...balances[coin], btcValue: balances[coin].total }
    } else {
      balances[coin] = { ...balances[coin], btcValue: balances[coin].total * tickers[t].last }
    }
    // console.log('this value', coin, t, balances[coin].total * tickers[t].last)
  })

  return balances
}

const addTickerSymbols = balances => {
  return Object.entries(balances).reduce((agg, [coin, v]) => {
    if (coin === 'BTC') {
      return { ...agg, [coin]: { ...v, ticker: `${coin}/USDT` } }
    } else {
      return { ...agg, [coin]: { ...v, ticker: `${coin}/BTC` } }
    }
  }, {})
}
