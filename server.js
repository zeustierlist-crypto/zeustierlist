require('dotenv').config();

const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();

const PORT = Number(process.env.PORT || 3000);
const DB_NAME = process.env.MONGODB_DB || 'zeuspvp';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'tierlist';
const DISCORD_URL = process.env.DISCORD_URL || 'https://discord.gg/zeuspvp';
const SERVER_IP = process.env.SERVER_IP || 'zeuspvp.net';

const TIER_POINTS = {
  LT5: 1,
  HT5: 2,
  LT4: 4,
  HT4: 6,
  LT3: 10,
  HT3: 20,
  LT2: 30,
  HT2: 40,
  LT1: 50,
  HT1: 60,
  NT: 0,
  'N/A': 0,
};

const GAMEMODE_ORDER = ['nethpot', 'crystal', 'mace', 'uhc', 'axe', 'smp'];

const GAMEMODES = {
  nethpot: { name: 'NethPot', icon: '/assets/icons/nethpot.svg' },
  crystal: { name: 'Crystal', icon: '/assets/icons/crystal.svg' },
  mace: { name: 'Mace', icon: '/assets/icons/mace.svg' },
  uhc: { name: 'UHC', icon: '/assets/icons/uhc.svg' },
  axe: { name: 'Axe', icon: '/assets/icons/axe.svg' },
  smp: { name: 'SMP', icon: '/assets/icons/smp.svg' },
};

let mongoClient = null;
let tierlistCollection = null;
let mongoConnectPromise = null;

const connectionState = {
  connected: false,
  error: null,
};

function tierToPoints(tier) {
  return TIER_POINTS[String(tier || 'N/A').trim().toUpperCase()] ?? 0;
}

function tierNumber(tier) {
  const match = String(tier || '').match(/[1-5]/);
  return match ? Number(match[0]) : 99;
}

function tierKind(tier) {
  const clean = String(tier || '').trim().toUpperCase();
  if (clean.startsWith('HT')) return 'HT';
  if (clean.startsWith('LT')) return 'LT';
  return 'NA';
}

function rankTitle(points) {
  const p = Number(points || 0);
  if (p >= 220) return 'Combat Grandmaster';
  if (p >= 160) return 'Combat Master';
  if (p >= 100) return 'Combat Specialist';
  if (p >= 40) return 'Knight';
  if (p >= 1) return 'Rookie';
  return 'Unranked';
}

function rankIcon(points) {
  const title = rankTitle(points);
  if (title === 'Combat Grandmaster') return '/assets/ranks/combat-grandmaster.webp';
  if (title === 'Combat Master') return '/assets/ranks/combat-master.webp';
  if (title === 'Combat Specialist') return '/assets/ranks/combat-specialist.svg';
  if (title === 'Knight') return '/assets/ranks/knight.svg';
  if (title === 'Rookie') return '/assets/ranks/rookie.svg';
  return '/assets/icons/overall.svg';
}

function skinUrl(ign) {
  return `https://render.crafty.gg/3d/bust/${encodeURIComponent(String(ign || 'Steve'))}`;
}

async function connectMongo() {
  if (tierlistCollection) return true;

  if (!process.env.MONGODB_URI) {
    connectionState.connected = false;
    connectionState.error = 'MONGODB_URI missing.';
    return false;
  }

  if (!mongoConnectPromise) {
    mongoConnectPromise = (async () => {
      mongoClient = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      await mongoClient.connect();

      const db = mongoClient.db(DB_NAME);
      tierlistCollection = db.collection(COLLECTION_NAME);

      await tierlistCollection.createIndex(
  { ignLower: 1, gamemode: 1 },
  { unique: true, name: 'ignLower_1_gamemode_1' }
);

      connectionState.connected = true;
      connectionState.error = null;

      return true;
    })().catch((error) => {
      connectionState.connected = false;
      connectionState.error = error.message;
      tierlistCollection = null;
      mongoClient = null;
      mongoConnectPromise = null;
      return false;
    });
  }

  return mongoConnectPromise;
}

function cleanEntry(entry) {
  const gamemode = String(entry.gamemode || '').toLowerCase();
  const tier = String(entry.tier || entry.tierEarned || entry.tier_earned || 'N/A').toUpperCase();
  const ign = String(entry.ign || entry.name || entry.username || 'Unknown');
  const points = Number(entry.points ?? tierToPoints(tier));

  return {
    ign,
    ignLower: String(entry.ignLower || ign).toLowerCase(),
    gamemode,
    gamemodeName: entry.gamemodeName || GAMEMODES[gamemode]?.name || gamemode,
    tier,
    region: String(entry.region || 'NA').toUpperCase(),
    points,
    tierNumber: tierNumber(tier),
    tierKind: tierKind(tier),
    skin: entry.skin || skinUrl(ign),
    updatedAt: entry.updatedAt || null,
  };
}

async function getEntries() {
  await connectMongo();

  if (tierlistCollection) {
    const docs = await tierlistCollection.find({}).toArray();
    return docs.map(cleanEntry);
  }

  return [];
}

function buildPlayers(entries) {
  const map = new Map();

  for (const entry of entries) {
    const key = entry.ignLower;

    const current = map.get(key) || {
      ign: entry.ign,
      ignLower: key,
      region: entry.region,
      skin: skinUrl(entry.ign),
      totalPoints: 0,
      ranks: [],
    };

    current.ranks = current.ranks.filter((rank) => rank.gamemode !== entry.gamemode);
    current.ranks.push(entry);

    current.totalPoints = current.ranks.reduce((sum, rank) => {
      return sum + Number(rank.points || 0);
    }, 0);

    current.region = entry.region || current.region;
    current.rankTitle = rankTitle(current.totalPoints);
    current.rankIcon = rankIcon(current.totalPoints);

    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => {
    return b.totalPoints - a.totalPoints || a.ign.localeCompare(b.ign);
  });
}

function withPositions(players) {
  return players.map((player, index) => ({
    ...player,
    position: index + 1,
    ranks: player.ranks.sort((a, b) => {
      return GAMEMODE_ORDER.indexOf(a.gamemode) - GAMEMODE_ORDER.indexOf(b.gamemode);
    }),
  }));
}

app.set('etag', false);
app.use(express.json());

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }

  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', async (_req, res) => {
  await connectMongo();

  res.json({
    ok: true,
    connected: connectionState.connected,
    error: connectionState.error,
    dbName: DB_NAME,
    collection: COLLECTION_NAME,
    discordUrl: DISCORD_URL,
    serverIp: SERVER_IP,
    gamemodes: GAMEMODES,
  });
});

app.get('/api/rankings', async (req, res) => {
  try {
    const mode = String(req.query.gamemode || 'overall').toLowerCase();
    const limit = Math.min(Number(req.query.limit || 100), 100);

    const entries = await getEntries();

    if (mode === 'overall') {
      const players = withPositions(buildPlayers(entries)).slice(0, limit);

      res.json({
        gamemode: 'overall',
        players,
        connected: connectionState.connected,
      });

      return;
    }

    const filtered = entries
      .filter((entry) => entry.gamemode === mode)
      .sort((a, b) => {
        return (
          a.tierNumber - b.tierNumber ||
          (b.tierKind === 'HT') - (a.tierKind === 'HT') ||
          b.points - a.points ||
          a.ign.localeCompare(b.ign)
        );
      });

    res.json({
      gamemode: mode,
      entries: filtered,
      connected: connectionState.connected,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load rankings.' });
  }
});

app.get('/api/player/:ign', async (req, res) => {
  try {
    const ignLower = String(req.params.ign || '').toLowerCase();

    const entries = await getEntries();
    const players = withPositions(buildPlayers(entries));
    const player = players.find((item) => item.ignLower === ignLower);

    if (!player) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    res.json(player);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load player.' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();

    if (!q) {
      res.json({ results: [] });
      return;
    }

    const entries = await getEntries();
    const players = withPositions(buildPlayers(entries));

    const results = players
      .filter((item) => item.ignLower.includes(q))
      .sort((a, b) => {
        const exactA = a.ignLower === q ? 1 : 0;
        const exactB = b.ignLower === q ? 1 : 0;
        return exactB - exactA || b.totalPoints - a.totalPoints;
      })
      .slice(0, 8);

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed.' });
  }
});

app.get('/api/docs.json', (_req, res) => {
  res.json({
    endpoints: [
      '/api/status',
      '/api/rankings?gamemode=overall&limit=100',
      '/api/rankings?gamemode=nethpot',
      '/api/player/:ign',
      '/api/search?q=IGN',
    ],
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

process.on('SIGINT', async () => {
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});

module.exports = app;
