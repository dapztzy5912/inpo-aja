const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/stocks', async (req, res) => {
  try {
    const now = moment().tz('Asia/Jakarta');
    const minutes = now.minutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const roundedTime = now.clone().minutes(roundedMinutes).seconds(0);
    const displayTime = roundedTime.format('D MMMM YYYY, HH:mm [WIB]');

    const stockRes = await fetch('https://growagarden.gg/stocks');
    const stockHtml = await stockRes.text();
    const $stock = cheerio.load(stockHtml);

    const parseStockList = (selector) => {
      const items = [];
      $stock(selector).each((i, el) => {
        const text = $stock(el).text().trim();
        const match = text.match(/(.*?) - Available Stock: (\d+)/i);
        if (match) {
          items.push(`[${match[2]}x] ${match[1]}`);
        } else {
          items.push(text);
        }
      });
      return items;
    };

    const seedStocks = parseStockList('h3:contains("Current Seed Shop Stock in Grow a Garden") + ul > li');
    const gearStocks = parseStockList('h3:contains("Current Gear Shop Stock in Grow a Garden") + ul > li');
    const eggStocks = parseStockList('h3:contains("Current Egg Shop Stock in Grow a Garden") + ul > li');

    res.json({
      updated: displayTime,
      seed: seedStocks,
      gear: gearStocks,
      egg: eggStocks
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});
