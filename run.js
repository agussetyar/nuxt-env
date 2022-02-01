const fs = require('fs')
const { Cluster } = require('puppeteer-cluster')
const vanillaPuppeteer = require('puppeteer')
const { addExtra } = require('puppeteer-extra')
const Stealth = require('puppeteer-extra-plugin-stealth')

async function main() {
  // Create a custom puppeteer-extra instance using `addExtra`,
  // so we could create additional ones with different plugin config.
  const puppeteer = addExtra(vanillaPuppeteer)
  puppeteer.use(Stealth())

  // Launch cluster with puppeteer-extra
  const cluster = await Cluster.launch({
    puppeteer,
    maxConcurrency: 5,
    concurrency: Cluster.CONCURRENCY_PAGE,
    puppeteerOptions: {
      args: ['--no-sandbox'],
    },
  })

  // Define task handler
  await cluster.task(async ({ page, data: url }) => {
    await page.goto(url)

    const env = await page.evaluate(() =>
      window.$nuxt ? window.$nuxt.context.env : null
    )
    const host = new URL(url).host

    if (env) {
      fs.writeFileSync(
        `results/${host}_env.json`,
        JSON.stringify(env, null, 2),
        {
          encoding: 'utf8',
        }
      )

      console.log(`${host} -> results/${host}_env.json`)
    } else {
      console.log(`${host} not NUXT`)
    }
  })

  const lists = fs
    .readFileSync('lists.txt', { encoding: 'utf8' })
    .split('\n')
    .filter((v) => v != '')

  lists.forEach((v) => cluster.queue(v))

  await cluster.idle()
  await cluster.close()
}

// Let's go
main().catch(console.warn)
