const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const frontendBuild = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuild));

let trackers = [];
let lastNotified = {};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const BMS_CITIES = [
  { name: 'Chennai', code: 'CHEN' },
  { name: 'Mumbai', code: 'MUMB' },
  { name: 'Delhi', code: 'NDLS' },
  { name: 'Bangalore', code: 'BANG' },
  { name: 'Hyderabad', code: 'HYD' },
  { name: 'Kolkata', code: 'KOLK' },
  { name: 'Pune', code: 'PUNE' },
  { name: 'Ahmedabad', code: 'AHMD' },
  { name: 'Kochi', code: 'KOCH' },
];

async function sendTelegram(token, chatId, message) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, { chat_id: chatId, text: message, parse_mode: 'HTML' });
    console.log('Telegram sent');
  } catch (e) {
    console.error('Telegram error:', e.message);
  }
}

async function checkBMS(tracker) {
  try {
    const { movieName, theaterName, showDate, showTime, bmsEventCode, cityCode } = tracker;
    const dateFormatted = showDate ? showDate.replace(/-/g, '') : '';
    const movieSlug = movieName.toLowerCase().replace(/\s+/g, '-');
    const url = bmsEventCode
      ? `https://in.bookmyshow.com/buytickets/${movieSlug}-${cityCode.toLowerCase()}/movie-${cityCode.toLowerCase()}-${bmsEventCode}-MT/${dateFormatted}`
      : `https://in.bookmyshow.com/movies/${cityCode.toLowerCase()}/${movieSlug}/`;

    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const text = res.data;

    const available = ['Book Now', 'BOOK NOW', 'Select Theatre', 'Onwards'].some(s => text.includes(s));
    const notAvailable = ['Booking opens', 'Coming Soon', 'No shows', 'Housefull'].some(s => text.includes(s));
    const theaterFound = theaterName ? text.toLowerCase().includes(theaterName.toLowerCase()) : true;
    const timeFound = showTime ? text.includes(showTime) : true;

    return available && !notAvailable && theaterFound && timeFound;
  } catch (e) {
    console.error('BMS check error:', e.message);
    return false;
  }
}

async function checkDistrict(tracker) {
  try {
    const { districtUrl, theaterName, showDate } = tracker;
    if (!districtUrl) return false;

    const res = await axios.get(districtUrl, { headers: HEADERS, timeout: 15000 });
    const text = res.data;

    const available = ['Book Now', 'BOOK NOW', 'book-now', 'bookNow', 'Select Seats'].some(s => text.includes(s));
    const theaterFound = theaterName ? text.toLowerCase().includes(theaterName.toLowerCase()) : true;
    let dateFound = true;
    if (showDate) {
      const d = new Date(showDate);
      const formats = [showDate, d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })];
      dateFound = formats.some(f => text.includes(f));
    }
    return available && theaterFound && dateFound;
  } catch (e) {
    console.error('District check error:', e.message);
    return false;
  }
}

async function runTrackers() {
  if (trackers.length === 0) return;
  for (const tracker of trackers) {
    if (!tracker.active) continue;
    const now = Date.now();
    if (lastNotified[tracker.id] && now - lastNotified[tracker.id] < 10 * 60 * 1000) continue;

    const foundBMS = (tracker.platform === 'bookmyshow' || tracker.platform === 'both') ? await checkBMS(tracker) : false;
    const foundDistrict = (tracker.platform === 'district' || tracker.platform === 'both') ? await checkDistrict(tracker) : false;

    if (foundBMS || foundDistrict) {
      const platforms = [foundBMS && 'BookMyShow', foundDistrict && 'District'].filter(Boolean).join(' & ');
      const msg =
        `🎬 <b>Tickets Available on ${platforms}!</b>\n\n` +
        `🎥 ${tracker.movieName}\n🏛️ ${tracker.theaterName || 'Any Theater'}\n` +
        `📅 ${tracker.showDate}\n⏰ ${tracker.showTime || 'Any Time'}\n💺 ${tracker.seatCategory || 'Any'}\n\n` +
        (foundBMS ? `🔗 <a href="https://in.bookmyshow.com">Book on BookMyShow</a>\n` : '') +
        (foundDistrict && tracker.districtUrl ? `🔗 <a href="${tracker.districtUrl}">Book on District</a>` : '');

      await sendTelegram(tracker.telegramToken, tracker.telegramChatId, msg);
      lastNotified[tracker.id] = now;
      tracker.lastFound = new Date().toISOString();
      tracker.status = 'notified';
    }
  }
}

cron.schedule('*/5 * * * *', runTrackers);

app.get('/api/cities', (req, res) => res.json({ bms: BMS_CITIES }));

app.get('/api/trackers', (req, res) => {
  res.json(trackers.map(t => ({ ...t, telegramToken: '***' })));
});

app.post('/api/trackers', (req, res) => {
  const tracker = { id: Date.now().toString(), active: true, status: 'watching', createdAt: new Date().toISOString(), lastFound: null, ...req.body };
  trackers.push(tracker);
  res.json({ success: true, tracker: { ...tracker, telegramToken: '***' } });
});

app.patch('/api/trackers/:id/toggle', (req, res) => {
  const t = trackers.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.active = !t.active;
  res.json({ success: true, active: t.active });
});

app.delete('/api/trackers/:id', (req, res) => {
  trackers = trackers.filter(t => t.id !== req.params.id);
  res.json({ success: true });
});

app.post('/api/trackers/:id/test', async (req, res) => {
  const t = trackers.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  await sendTelegram(t.telegramToken, t.telegramChatId, `✅ Test from CineAlert!\n\nTracker for <b>${t.movieName}</b> is active.`);
  res.json({ success: true });
});

app.post('/api/test-telegram', async (req, res) => {
  const { token, chatId } = req.body;
  try {
    await sendTelegram(token, chatId, '✅ CineAlert connected! You will receive ticket alerts here. 🎬');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/run-now', async (req, res) => {
  await runTrackers();
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CineAlert running on port ${PORT}`));
