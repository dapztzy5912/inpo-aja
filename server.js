const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Roblox Stalker function
async function robloxstalk(username) {
  try {
    // Search for user by username
    const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return { status: false, message: 'User not found' };
    }
    
    const userData = searchData.data[0];
    const userId = userData.id;
    
    // Get detailed user information
    const userDetailUrl = `https://users.roblox.com/v1/users/${userId}`;
    const userDetailResponse = await fetch(userDetailUrl);
    const userDetail = await userDetailResponse.json();
    
    // Get user avatar
    const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
    const avatarResponse = await fetch(avatarUrl);
    const avatarData = await avatarResponse.json();
    
    // Get presence info (online status)
    const presenceUrl = `https://presence.roblox.com/v1/presence/users?userIds=${userId}`;
    const presenceResponse = await fetch(presenceUrl);
    const presenceData = await presenceResponse.json();
    
    const avatarImageUrl = avatarData.data && avatarData.data[0] ? avatarData.data[0].imageUrl : null;
    const presenceInfo = presenceData.userPresences && presenceData.userPresences[0] ? presenceData.userPresences[0] : {};
    
    const result = {
      status: true,
      shiroko: {
        displayName: userDetail.displayName || userData.displayName,
        name: userDetail.name || userData.name,
        isBanned: userDetail.isBanned || false,
        hasVerifiedBadge: userDetail.hasVerifiedBadge || false,
        id: userId,
        created: userDetail.created ? new Date(userDetail.created).toLocaleDateString('id-ID') : 'Unknown',
        lastOnline: presenceInfo.lastOnline ? new Date(presenceInfo.lastOnline).toLocaleDateString('id-ID') : 'Unknown',
        description: userDetail.description || 'No description',
        profileDetails: avatarImageUrl || `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
        userPresenceType: presenceInfo.userPresenceType || 0,
        lastLocation: presenceInfo.lastLocation || 'Unknown'
      }
    };
    
    return result;
  } catch (error) {
    console.error('Roblox stalk error:', error);
    return { status: false, message: error.message };
  }
}

// Original stocks endpoint
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

// New Roblox Stalker endpoint
app.post('/api/roblox-stalk', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await robloxstalk(username);
    res.json(result);
  } catch (error) {
    console.error('Roblox stalk API error:', error);
    res.status(500).json({ error: 'Failed to fetch Roblox user data: ' + error.message });
  }
});

// GET endpoint for Roblox Stalker (alternative)
app.get('/api/roblox-stalk/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await robloxstalk(username);
    res.json(result);
  } catch (error) {
    console.error('Roblox stalk API error:', error);
    res.status(500).json({ error: 'Failed to fetch Roblox user data: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});
