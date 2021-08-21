import { Command } from 'commander/esm.mjs'
import dotenv from 'dotenv'

import Binance from './apis/binance.js'
import Bitso from './apis/bitso.js'
import Huobi from './apis/huobi.js'
import FTX from './apis/ftx.js'

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

const binanceClient = new Binance(BINANCE_API_KEY, BINANCE_API_SECRET)
const bitsoClient = new Bitso(BITSO_API_KEY, BITSO_API_SECRET)
const huobiClient = new Huobi(HUOBI_API_KEY, HUOBI_API_SECRET)
const ftxClient = new FTX(FTX_API_KEY, FTX_API_SECRET)

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
 await program.parseAsync(process.argv)
}

await main()
