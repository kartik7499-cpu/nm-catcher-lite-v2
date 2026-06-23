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

---

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

### 👑 Owner Management

- **`.owneradd @user`** – Add a new owner (no restart required)  
- **`.ownerremove @user`** – Remove an owner  
- **`.owners`** – List all owners  

> Primary owner is defined in `.env`  
> Additional owners are stored dynamically in `data/owners.json`

---

### ❓ Help

- **`.help`** – Displays all available commands  

---

## 🔧 Environment Configuration (`.env`)

All configuration is done via a `.env` file.

### Example `.env`

```env
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE

# 🔑 PRIMARY OWNER (DO NOT REMOVE)
OWNER_IDS=YOUR_DISCORD_USER_ID_HERE

PREFIX=.

CATCH_WEBHOOK_URL=YOUR_CATCH_WEBHOOK_URL_HERE
LOG_WEBHOOK_URL=YOUR_LOG_WEBHOOK_URL_HERE
CAPTCHA_LOGGING_WEBHOOK=YOUR_CAPTCHA_LOGGING_WEBHOOK_URL_HERE

PREDICTION_API_URL=http://jobs.hidencloud.com:24593
PREDICTION_API_KEY=YOUR_PREDICTION_API_KEY_HERE

CAPTCHA_API_BASE=http://prem-eu1.bot-hosting.net:22498
CAPTCHA_API_KEY=YOUR_API_KEY_HERE
```

---

## 📝 Configuration Notes

- `OWNER_IDS` should contain **at least one permanent owner**
- Do **NOT** remove the main owner from `.env`
- Additional owners are managed **in-app (no restart required)**
- Do **NOT** modify API URLs
- Purchase the AI API key from YAKUZA https://discord.gg/SPsYceZAc2
- Only the **new captcha solver by shuu** is supported  
  Older versions will not work  
  Shuu https://discord.gg/jWW8skuYsZ

---

## ⚡ Owner System (How it Works)

- `.env` → **Primary owner (always trusted)**
- `owners.json` → **Dynamic owners (added via commands)**
- No restart required for adding/removing owners
- Bot checks both sources automatically

---

## 📌 Final Notes

- Restart the bot after `.env` changes  
- No restart needed for owner commands  
- Shiny Pokémon are detected **after catch**  
- Balance checks occur on:
  - First successful catch  
  - Every 30 successful catches  
  - Every PC increment (e.g. +35, +100)

---

## 🚀 NM Catcher Lite

**Lightweight • Stable • Efficient**
