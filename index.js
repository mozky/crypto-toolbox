import { Command } from 'commander/esm.mjs'
import dotenv from 'dotenv'
import ccxt from 'ccxt'

import Binance from './apis/binance.js'
import Bitso from './apis/bitso.js'
import Huobi from './apis/huobi.js'
import FTX from './apis/ftx.js'

import getBTCValue from './utils/getBTCValue.js'

dotenv.config({ path: '.secrets' })

const {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  FTX_API_KEY,
  FTX_API_SECRET,
  BITSO_API_KEY,
  BITSO_API_SECRET,
  HUOBI_API_KEY,
  HUOBI_API_SECRET
} = process.env

const binanceClient = new ccxt.binance({apiKey: BINANCE_API_KEY, secret: BINANCE_API_SECRET})
const bitsoClient = new ccxt.bitso({ apiKey: BITSO_API_KEY, secret: BITSO_API_SECRET, nonce() { return this.milliseconds() } })
const huobiClient = new ccxt.huobi({ apiKey: HUOBI_API_KEY, secret: HUOBI_API_SECRET })
const ftxClient = new ccxt.ftx({ apiKey: FTX_API_KEY, secret: FTX_API_SECRET })

/* const binanceClient = new Binance({apiKey: BINANCE_API_KEY, secret: BINANCE_API_SECRET})
const bitsoClient = new Bitso({ apiKey: BITSO_API_KEY, secret: BITSO_API_SECRET })
const huobiClient = new Huobi({ apiKey: HUOBI_API_KEY, secret: HUOBI_API_SECRET })
const ftxClient = new FTX({ apiKey: FTX_API_KEY, secret: FTX_API_SECRET }) */

const clients = {
  ftx: ftxClient,
  binance: binanceClient,
  huobi: huobiClient,
  bitso: bitsoClient
}


const program = new Command()

async function main() {
  program
    .command('balance [wallet]')
    .description('get the balance of a specific wallet')
    .action(async wallet => {
      if (wallet === 'all') {
        const balancesPromises = Object.values(clients).map(async c => {
          const balance = await c.getUSDBalance()

          return { wallet: c.constructor.name, total_usd_value: balance }
        })

        let balances = []
        try {
          balances = (await Promise.allSettled(balancesPromises)).map(p => p.value)
        } catch (error) {
          console.error(error)
        }

        const wallets_total_usd = balances.reduce((acc, curr) => {
          if (!curr) return acc
          return acc + curr.total_usd_value
        }, 0)

        balances.push({wallet: 'TOTAL', total_usd_value: Number(wallets_total_usd.toFixed(2)) })

        console.table(balances)
      } else if (clients[wallet]) {
        const balance = await clients[wallet].getUSDBalance()

        console.log(balance)
      } else {
        console.log(`Wallet ${wallet} not supported, supported wallets ${Object.keys(clients)}`)
      }

      process.exit()
    })

  program
    .command('balance2 [exchange]')
    .description('get the balance of a specific exchange')
    .action(async exchange => {
      if (exchange === 'all') {
        const balancesPromises = Object.values(clients).map(async c => {
          const balance = await c.fetchBalance()

          const { total } = balance

          return { wallet: c.constructor.name, total }
        })

        let balances = []
        try {
          balances = (await Promise.allSettled(balancesPromises)).map(p => p.value)
        } catch (error) {
          console.error(error)
        }

        const agg = balances.reduce((agg, curr) => {
          const { total } = curr

          const newAgg = agg
          Object.entries(total).forEach(([k, v]) => {
            if (v > 0.001) {
              if (agg[k]) {
                newAgg[k] = { total: agg[k].total + v, btcValue: 0 }
              } else {
                newAgg[k] = { total: v, btcValue: 0 }
              }
            }
          })

          return newAgg
        }, {})

        const fullBalances = await getBTCValue(agg, clients['binance'])

        const btcTotal = Object.values(fullBalances).reduce((agg, v) => {
          return v.btcValue ? (agg + v.btcValue) : agg
        }, 0)

        Object.entries(fullBalances).forEach(([k,v]) => {
          fullBalances[k] = { ...v, '%': v.btcValue ? (v.btcValue / btcTotal) * 100 : 0 }
        })

        console.table(fullBalances)
        console.log(btcTotal)
      } else {
        const client = clients[exchange]

        const { total } = await client.fetchBalance()

        const agg = {}
        Object.entries(total).forEach(([k, v]) => {
          if (v > 0.001) {
            agg[k] = { total: v, btcValue: 0 }
          }
        })

        const fullBalances = await getBTCValue(agg, client)

        const btcTotal = Object.values(fullBalances).reduce((agg, v) => {
          return v.btcValue ? (agg + v.btcValue) : agg
        }, 0)

        Object.entries(fullBalances).forEach(([k,v]) => {
          fullBalances[k] = { ...v, '%': v.btcValue ? (v.btcValue / btcTotal) * 100 : 0 }
        })

        console.table(fullBalances)
        console.log(`TOTAL BTC: ${btcTotal}`)
      }

      process.exit()
    })
 await program.parseAsync(process.argv)
}

await main()
