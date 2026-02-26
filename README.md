# NM Catcher Lite

## ⚠️ Notice

This software is provided **as-is**.  
Using NM Catcher Lite **may violate Discord’s Terms of Service or third-party service rules**.

- The developers are **not responsible** for bans, losses, or misuse
- You use this project **entirely at your own risk**
- By running this software, you accept full responsibility for all actions performed by it

---

## ⚠️ Important Warning

This project is **NOT plug-and-play for code modification**.

- ❌ **Do NOT edit source files** unless you know exactly what you are doing
- ❌ Any broken code caused by user edits is **NOT the responsibility of the developers**
- ✅ Only change **explicitly documented configuration fields**
- If something breaks after you edited the code, **the responsibility is entirely on the user**

> If you are unsure — **do not touch the code**.  
> Use commands and `.env` configuration only.

---

## 📌 What is NM Catcher Lite?

**NM Catcher Lite** is a lightweight version of the main **NM Catcher** project.

- Built for **small servers** and **low-resource environments**
- Simple workflow with minimal setup
- Designed for **long-running, stable automation**
- Uses AI-based image prediction for Pokémon detection
- Supports webhook logging and optional captcha solving

> **Lite** is designed to provide an easy workflow and reliable performance on smaller setups.

---

## 🧾 Commands

All commands are **owner-only** and use the prefix defined in your `.env` file.

### ▶️ Startup & Catcher Management

- **`.start`** – Starts **all** autocatchers  
- **`.start <index>`** – Starts a **specific** autocatcher  
- **`.stop`** – Stops **all** autocatchers  
- **`.stop <index>`** – Stops a **specific** autocatcher  

---

### 📊 System & AI

- **`.stats`** – Shows NM Catcher Lite statistics
- **`.api`** – Shows AI API status and remaining quota

---

### 🔐 Token Management

- **`.list`** – Lists all stored tokens
- **`.catching`** – Shows currently active catchers
- **`.add <token>`** – Adds a token to the system
- **`.remove <index>`** – Removes a token by index

---

### ⚙️ Autocatcher Utilities

- **`.say <message>`** – Makes all active catchers send a message
- **`.autoclick on`** – Enables automatic button clicking
- **`.autoclick off`** – Disables automatic button clicking

---

### ❓ Help

- **`.help`** – Displays all available commands

---

## 🔧 Environment Configuration (`.env`)

All configuration is done via a `.env` file.

### Example `.env` (Preview)

```env
DISCORD_TOKEN=your_discord_bot_token_here
OWNER_IDS=123456789012345678,987654321098765432
PREFIX=.

CATCH_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxxxx
LOG_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxxxx
CAPTCHA_LOGGING_WEBHOOK=https://discord.com/api/webhooks/xxxxxxxx

PREDICTION_API_URL=http://api.necrozma.qzz.io
PREDICTION_API_KEY=your_prediction_api_key_here

CAPTCHA_API_KEY=your_captcha_license_key_here
CAPTCHA_API_HOSTNAME=194.58.66.199
CAPTCHA_API_PORT=6973
```

---

## 📝 Configuration Notes

- `OWNER_IDS` supports **multiple owners**
- Separate IDs with commas **without spaces**
- Do **NOT** modify API URL values
- Purchase the AI API key from YAKUZA [Discord server](https://discord.gg/SPsYceZAc2)
- Only the **new captcha solver by shuu** is supported older version wont work Shuu [Discord Server](https://discord.gg/jWW8skuYsZ)

---

## 📌 Final Notes

- Restart the bot after `.env` changes
- Shiny Pokémon are detected **after catch**
- Balance checks occur on:
  - First successful catch
  - Every 30 successful catches
  - And on every pc increment (example +35, +100, etc.)

---

**NM Catcher Lite**  
Lightweight • Stable • Efficient
