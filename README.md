# ZeusPvP Tierlist Website

This is the ZeusPvP tierlist website connected to the same MongoDB database used by the Discord tier bot.

## Features

- Overall top 100 ranking by total points
- Separate gamemode pages: NethPot, Crystal, Mace, UHC, Axe, SMP
- Smooth loading gate intro
- Smooth tab/page transitions
- ZeusPvP logo and background included
- Player hover glow + slide animation
- Profile popup closes when clicking outside it
- Right-click menu: Profile, Copy username, Copy tiers
- Search by IGN, including players outside the top 100
- MongoDB API backend
- Uses Crafty render skins: `https://render.crafty.gg/3d/bust/<IGN>`

## Install

```bash
npm install
```

## Setup `.env`

Copy `.env.example` to `.env` and fill it in:

```env
PORT=3000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=zeuspvp
USE_DEMO_DATA=false
DISCORD_URL=https://discord.gg/zeuspvp
```

For local preview without MongoDB, set:

```env
USE_DEMO_DATA=true
```

## Start

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## MongoDB collections used

The site reads from:

```text
tierlist
```

Expected documents look like this:

```json
{
  "ign": "PlayerIGN",
  "ignLower": "playerign",
  "gamemode": "nethpot",
  "gamemodeName": "NethPot",
  "tier": "HT3",
  "region": "AS",
  "points": 20,
  "updatedAt": "2026-06-20T00:00:00.000Z"
}
```

The Discord bot `/rank` and `/results` commands already save this data when MongoDB is configured.

## API endpoints

```text
/api/status
/api/rankings?gamemode=overall&limit=100
/api/rankings?gamemode=nethpot
/api/player/:ign
/api/search?q=IGN
```
