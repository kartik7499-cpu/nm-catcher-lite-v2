const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class TokenService {
  constructor(bot) {
    this.bot = bot;
    this.tokens = [];
    this.dataPath = path.join(__dirname, '../data/tokens.json');
    this.ensureDataDirectory();
    this.loadTokens();
  }

  ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      Logger.info('Created data directory');
    }
  }

  async loadTokens() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        Logger.info('No tokens file found, starting fresh');
        return;
      }

      const raw = fs.readFileSync(this.dataPath, 'utf8');
      const data = JSON.parse(raw);

      Logger.info(`Loading ${data.length} saved token(s)...`);

      for (const tokenData of data) {
        try {
          const client = new Client({
            checkUpdate: false,
            ws: { properties: { browser: 'Discord Client', os: 'Windows' } }
          });

          await client.login(tokenData.token);

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Login timeout')), 15000);

            if (client.user) {
              clearTimeout(timeout);
              resolve();
              return;
            }

            client.once('ready', () => {
              clearTimeout(timeout);
              resolve();
            });

            const checkInterval = setInterval(() => {
              if (client.user) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve();
              }
            }, 500);
          });

          const addedAt =
            tokenData.addedAt && !isNaN(new Date(tokenData.addedAt))
              ? new Date(tokenData.addedAt)
              : new Date();

          this.tokens.push({
            index: this.tokens.length,
            token: tokenData.token,
            userId: client.user.id,
            username: client.user.tag,
            displayName: client.user.displayName || client.user.username,
            tokenPreview: tokenData.tokenPreview || tokenData.token.slice(0, 20) + '...',
            addedAt,
            status: 'active',
            client,

            balance: tokenData.balance || 0,
            totalCatches: tokenData.totalCatches || 0
          });

          Logger.success(`✅ Loaded: ${client.user.tag}`);
        } catch (error) {
          Logger.error(`Failed to load token: ${tokenData.username || 'Unknown'}`, error);
        }
      }

      Logger.success(`✅ Loaded ${this.tokens.length} token(s) from data/tokens.json`);
    } catch (error) {
      Logger.error('Failed to load tokens:', error);
    }
  }

  saveTokens() {
    try {
      const data = this.tokens
        .filter(Boolean)
        .map(t => ({
          token: t.token,
          tokenPreview: t.tokenPreview,
          userId: t.userId,
          username: t.username,
          displayName: t.displayName,
          addedAt:
            t.addedAt instanceof Date && !isNaN(t.addedAt)
              ? t.addedAt.toISOString()
              : new Date().toISOString(),

          balance: t.balance || 0,
          totalCatches: t.totalCatches || 0
        }));

      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
      Logger.debug('Tokens saved to data/tokens.json');
    } catch (error) {
      Logger.error('Failed to save tokens:', error);
    }
  }

  async addToken(tokenString) {
    try {
      const client = new Client({
        checkUpdate: false,
        ws: { properties: { browser: 'Discord Client', os: 'Windows' } }
      });

      await client.login(tokenString);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Login timeout')), 15000);

        if (client.user) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        const checkInterval = setInterval(() => {
          if (client.user) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 500);
      });

      const user = client.user;

      if (this.tokens.some(t => t.userId === user.id)) {
        client.destroy();
        return { success: false, error: 'Token already exists' };
      }

      const tokenData = {
        index: this.tokens.length,
        token: tokenString,
        username: user.tag,
        userId: user.id,
        displayName: user.displayName || user.username,
        tokenPreview: tokenString.slice(0, 20) + '...',
        client,
        status: 'active',

        balance: 0,
        totalCatches: 0,
        addedAt: new Date()
      };

      this.tokens.push(tokenData);
      this.saveTokens();

      Logger.success(`Token added: ${user.tag} (#${tokenData.index})`);

      return {
        success: true,
        index: tokenData.index,
        username: user.tag,
        userId: user.id
      };
    } catch {
      return { success: false, error: 'Invalid token or login failed' };
    }
  }

  removeToken(index) {
    const tokenData = this.tokens[index];
    if (!tokenData) return { success: false, error: 'Token not found' };

    if (tokenData.client) {
      try {
        tokenData.client.destroy();
      } catch {
        Logger.warn(`Failed to destroy client for ${tokenData.username}`);
      }
    }

    this.tokens.splice(index, 1);
    this.tokens.forEach((t, i) => (t.index = i));

    this.saveTokens();
    Logger.info(`Token removed: ${tokenData.username} (#${index})`);

    return {
      success: true,
      username: tokenData.username,
      userId: tokenData.userId
    };
  }

  async updateBalance(index, balance) {
    const token = this.tokens[index];
    if (!token || isNaN(balance)) return false;

    token.balance = balance;
    this.saveTokens();

    Logger.success(`💰 Balance updated for ${token.username}: ${balance.toLocaleString()} Pokécoins`);
    return true;
  }

  async incrementCatches(index) {
    const token = this.tokens[index];
    if (!token) return 0;

    token.totalCatches = (token.totalCatches || 0) + 1;
    this.saveTokens();

    return token.totalCatches;
  }

  getToken(index) {
    return this.tokens[index] || null;
  }

  getAllTokens() {
    return this.tokens.map((t, i) => ({
      index: i,
      userId: t.userId,
      username: t.username,
      displayName: t.displayName,
      tokenPreview: t.tokenPreview,
      status: t.status,
      balance: t.balance || 0,
      totalCatches: t.totalCatches || 0
    }));
  }
}

module.exports = TokenService;