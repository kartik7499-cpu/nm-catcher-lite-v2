const axios = require('axios');
const Logger = require('../utils/logger');

class AutocatcherService {
  constructor(tokenService, aiService, captchaService, webhookService, starterService, hintService, bot) {
    this.tokenService = tokenService;
    this.aiService = aiService;
    this.captchaService = captchaService;
    this.webhookService = webhookService;
    this.starterService = starterService;
    this.bot = bot;
    
    this.catchingState = new Map();
    this.hintService = hintService;
    this.pauseReasons = new Map();
    this.awaitingBalanceResponse = new Map();
    this.balanceCheckInterval = 30;
    this.autoClickState = new Map();
    this.poketwoId = '716390085896962058';
    
    this.catchDelay = {
      enabled: true,
      minDelay: 1500,
      maxDelay: 4000,
      randomize: true
    };
  }

  getRandomDelay() {
    if (!this.catchDelay.randomize) return this.catchDelay.minDelay;
    const min = this.catchDelay.minDelay;
    const max = this.catchDelay.maxDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadImage(imageUrl) {
    try {
      Logger.info(`📥 Downloading: ${imageUrl.substring(0, 80)}...`);
      
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://discord.com/',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'no-cache'
        }
      });
      
      const buffer = Buffer.from(response.data);
      if (buffer.length === 0) {
        Logger.error('❌ Empty image buffer received');
        return null;
      }
      
      Logger.info(`✅ Image downloaded: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      Logger.error(`❌ DOWNLOAD FAILED: ${imageUrl.substring(0, 80)}`);
      Logger.error(`   Code: ${error.code || 'N/A'}`);
      Logger.error(`   Message: ${error.message}`);
      
      if (error.response) {
        Logger.error(`   Status: ${error.response.status}`);
        Logger.error(`   StatusText: ${error.response.statusText}`);
      }
      return null;
    }
  }

  async safeSend(channel, content, retries = 2) {
  if (!channel?.send) return false;

  for (let i = 0; i <= retries; i++) {
    try {
      await channel.send(content);
      return true;
    } catch (err) {
      const msg = err?.message || "";

      if (
        msg.includes("aborted") ||
        msg.includes("ECONNRESET") ||
        msg.includes("network") ||
        err.code === 500
      ) {
        Logger.warn(`⚠️ Send aborted, retrying (${i + 1}/${retries})`);
        await this.sleep(800 + Math.random() * 700);
        continue;
      }

      if (err.code === 50013 || msg.includes("Missing Permissions")) {
        Logger.error(`❌ No permission to send message`);
        return false;
      }

      if (err.code === 10003 || msg.includes("Unknown Channel")) {
        Logger.error(`❌ Channel invalid`);
        return false;
      }

      Logger.error(`❌ Send failed: ${msg}`);
      return false;
    }
  }

  Logger.error(`❌ Send failed after retries`);
  return false;
}

  async pauseCatching(tokenIndex, reason = 'manual') {
    const token = this.tokenService.getToken(tokenIndex);
    if (!token) return { success: false, error: 'Token not found' };

    const state = this.catchingState.get(tokenIndex);
    if (!state?.active || state.isPaused) {
      return { success: false, error: 'Not active or already paused' };
    }

    state.isPaused = true;
    this.pauseReasons.set(tokenIndex, reason);
    Logger.warn(`⏸️ ${token.username} (#${tokenIndex}) paused: ${reason}`);
    return { success: true, username: token.username, reason };
  }

  async resumeCatching(tokenIndex) {
    const token = this.tokenService.getToken(tokenIndex);
    if (!token) return { success: false, error: 'Token not found' };

    const state = this.catchingState.get(tokenIndex);
    if (!state?.active || !state.isPaused) {
      return { success: false, error: 'Not paused or not active' };
    }

    state.isPaused = false;
    this.pauseReasons.delete(tokenIndex);
    Logger.success(`▶️ ${token.username} (#${tokenIndex}) resumed`);
    return { success: true, username: token.username };
  }

  async startCatching(tokenIndex, mode = 'ai') {
    const token = this.tokenService.getToken(tokenIndex);
    if (!token) return { success: false, error: 'Token not found' };

    if (this.catchingState.has(tokenIndex) && this.catchingState.get(tokenIndex)?.active) {
      const state = this.catchingState.get(tokenIndex);
      return { 
        success: false, 
        error: `Already catching (${state.mode} mode)${state.isPaused ? ` - PAUSED: ${this.pauseReasons.get(tokenIndex)}` : ''}` 
      };
    }

    if (mode === 'ai' && !this.aiService.isAvailable()) {
      return { success: false, error: '❌ AI Prediction service not configured' };
    }

    this.catchingState.set(tokenIndex, {
      active: true,
      mode,
      isPaused: false,
      needsBalanceCheck: true,
      stats: {
        spawnsDetected: 0,
        catchAttempts: 0,
        catchSuccess: 0,
        catchFailed: 0,
        captchaDetected: 0,
        autoClicks: 0,
        startTime: new Date()
      },
      lastCatch: null,
      pendingCatches: new Map(),
      retryMap: new Map()
    });

    this.setupListener(token, tokenIndex);
    Logger.success(`✅ Started ${mode.toUpperCase()} catching for ${token.username} (#${tokenIndex})`);
    return { success: true, username: token.username, mode };
  }

  async stopCatching(tokenIndex) {
    const token = this.tokenService.getToken(tokenIndex);
    if (!token) return { success: false, error: 'Token not found' };

    const state = this.catchingState.get(tokenIndex);
    if (!state?.active) return { success: false, error: 'Not currently catching' };

    state.active = false;
    this.catchingState.delete(tokenIndex);
    this.pauseReasons.delete(tokenIndex);

    if (token.client?.removeAllListeners) {
      token.client.removeAllListeners('messageCreate');
      token.client.removeAllListeners('interactionCreate');
    }

    Logger.success(`✅ Stopped catching for ${token.username} (#${tokenIndex})`);
    Logger.info(`📊 Final stats: ${JSON.stringify(state.stats)}`);
    return { success: true, username: token.username, stats: state.stats };
  }

  async handleCatchConfirmation(message, token, tokenIndex) {
  const state = this.catchingState.get(tokenIndex);
  if (!state?.active || !state.pendingCatches) return;

  const content = message.content;
  Logger.info(`📋 Catch confirmation check: ${content.substring(0, 120)}...`);

  const levelMatch = content.match(/Level\s+(\d+)/i);
  const pokemonMatch = content.match(/Level\s+\d+\s+([^<(\n]+?)(?=\s*<|(?:\s*\())/i);
  const ivMatch = content.match(/\((\d+(?:\.\d+)?)%/);

  if (!levelMatch || !pokemonMatch || !ivMatch) {
    Logger.debug(
      `❌ Parse failed: Level=${levelMatch?.[1]}, Pokemon=${pokemonMatch?.[1]}, IV=${ivMatch?.[1]}`
    );
    return;
  }

  const level = levelMatch[1];
  const rawPokemon = pokemonMatch[1].trim();
  const iv = parseFloat(ivMatch[1]).toFixed(1);

  const isShiny =
    content.includes("✨") ||
    content.includes("shiny") ||
    content.includes("unusual");

  const isForThisAccount =
    message.mentions.users?.has(token.userId) ||
    content.includes(`<@${token.userId}>`) ||
    content.toLowerCase().includes(token.username.toLowerCase()) ||
    message.reference?.userId === token.userId;

  if (!isForThisAccount) {
    Logger.debug(`❌ Not for ${token.username}`);
    return;
  }

  const channelId = message.channel.id;

  // ✅ CLEAR retry tracking AFTER SUCCESS
  if (state.retryMap) {
    state.retryMap.delete(channelId);
  }

  const catchData = state.pendingCatches.get(channelId);
  if (!catchData) {
    Logger.debug(`❌ No pending catch for #${message.channel.name}`);
    return;
  }

  Logger.success(
    `🎉 ${token.username} CAUGHT ${rawPokemon.toUpperCase()}! L${level} ${iv}%${
      isShiny ? " ✨SHINY✨" : ""
    }`
  );

  try {
    const tokenWithIndex = { ...token, index: tokenIndex };

    const aiLatency = catchData.aiLatency;

    await this.webhookService.logCatch(
      tokenWithIndex,
      catchData.pokemon,
      catchData.rarity ||
        this.webhookService.getRarity(catchData.pokemon),
      {
        level: parseInt(level),
        iv: parseFloat(iv),
      },
      isShiny,
      {
        latency: aiLatency,
        confidence: catchData.confidence,
        quotaRemaining: catchData.quotaRemaining,
      }
    );

    Logger.success(
      `✅ WEBHOOK SENT: ${catchData.pokemon} (${aiLatency}ms)`
    );

    state.pendingCatches.delete(channelId);
  } catch (error) {
    Logger.error(`❌ WEBHOOK ERROR: ${error.message}`);
    Logger.error(`   Stack: ${error.stack?.substring(0, 200)}`);
  }

  state.stats.catchSuccess++;
  await this.tokenService.incrementCatches(tokenIndex);

  if (
    state.stats.catchSuccess === 1 ||
    state.stats.catchSuccess % this.balanceCheckInterval === 0
  ) {
    state.needsBalanceCheck = true;
  }

  state.lastCatch = catchData;
}

async handleAutoClickMessage(message, token, tokenIndex) {
  if (!this.autoClickState.get(tokenIndex)) return;
  if (!message.components || message.components.length === 0) return;

  const isReplyingToThisAccount =
    message.mentions.users.has(token.userId) ||
    message.reference?.userId === token.userId ||
    message.interaction?.user.id === token.userId;

  if (!isReplyingToThisAccount) {
    Logger.debug(
      `Message not for ${token.username}, skipping auto-click`
    );
    return;
  }

  for (const row of message.components) {
    if (!row.components || row.components.length === 0) continue;

    for (const button of row.components) {
      if (!button.label || !button.customId) continue;

      const label = button.label.toLowerCase();

      if (label.includes("confirm") || label.includes("accept")) {
        const delay =
          Math.floor(Math.random() * 1000) + 2000;

        Logger.info(
          `⏳ Waiting ${(delay / 1000).toFixed(
            1
          )}s before clicking "${button.label}"`
        );

        await this.sleep(delay);

        Logger.info(`🖱️ Auto-clicking "${button.label}"`);
        await message.clickButton(button.customId);

        const state = this.catchingState.get(tokenIndex);
        if (state) state.stats.autoClicks++;

        Logger.success(
          `✅ Clicked "${button.label}" for ${token.username}`
        );

        return;
      }
    }
  }
}

  async handleAutoClick(interaction, token, tokenIndex) {
    if (!this.autoClickState.get(tokenIndex)) return;
    if (!interaction.isButton()) return;
    if (interaction.message.author.id !== this.poketwoId) return;
    
    try {
      await interaction.deferUpdate();
      Logger.success(`🖱️ Auto-clicked: ${interaction.customId}`);
      
      const state = this.catchingState.get(tokenIndex);
      if (state) state.stats.autoClicks++;
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) {
        Logger.debug(`Button already handled`);
      } else {
        Logger.error(`❌ Auto-click failed: ${error.message}`);
      }
    }
  }

  setupListener(token, tokenIndex) {
    const client = token.client;
    if (!client) {
      Logger.error(`❌ No client for ${token.username}`);
      return;
    }

    client.on('messageCreate', async (message) => {
      if (message.components?.length > 0) {
        await this.handleAutoClickMessage(message, token, tokenIndex);
      }

      if (message.author.id !== this.poketwoId) return;

      await this.handleBalanceResponse(message, tokenIndex);
      
      const state = this.catchingState.get(tokenIndex);
      if (!state?.active) return;

      if (message.content.includes("That is the wrong")) {
  await this.handleWrongGuess(message, tokenIndex, token);
  return;
}

      if (message.content.toLowerCase().includes('congratulations') || 
          message.content.toLowerCase().includes('you caught')) {
        await this.handleCatchConfirmation(message, token, tokenIndex);
        return;
      }

      if (this.starterService?.isStarterPrompt?.(message.content) || 
    this.starterService?.isTOSMessage?.(message)) {

  if (this.starterService.starterLocks.has(tokenIndex)) {
    Logger.debug(`Starter already running for ${token.username}`);
    return;
  }

  Logger.info(`🎯 Starter detected - restarting flow`);

  await this.pauseCatching(tokenIndex, 'starter');

  const result = await this.starterService.handleStarter(token, message.channel.id);

  if (!result.success) {
    Logger.error(`❌ Starter failed for ${token.username}: ${result.reason}`);
    return;
  }

  Logger.success(`♻️ Restarting catcher for ${token.username}`);

  await this.stopCatching(tokenIndex);

  const delay = Math.floor(Math.random() * 3000) + 2000;
  await this.sleep(delay);

  await this.startCatching(tokenIndex);

  return;
}

const content = message.content.toLowerCase();

if (
  content.includes('verify.poketwo.net/captcha') ||
  content.includes('captcha') ||
  content.includes('are you a human')
) {
  await this.handleCaptcha(message, token, tokenIndex);
  return;
}

      if (state.isPaused) {
        Logger.debug(`${token.username} paused, skipping`);
        return;
      }


      if (this.isRealSpawn(message)) {
        await this.handleSpawn(message, tokenIndex, token);
      }
    });

    client.on('interactionCreate', async (interaction) => {
      await this.handleAutoClick(interaction, token, tokenIndex);
    });

    Logger.debug(`✅ Listener ready for ${token.username}`);
  }

  async handleBalanceResponse(message, tokenIndex) {
    const pending = this.awaitingBalanceResponse.get(tokenIndex);
    if (!pending) return;

    if (!message.embeds?.length) return;

    const embed = message.embeds[0];
    const title = embed.title?.toLowerCase() || '';

    if (!title.includes('balance')) return;
    if (!title.includes(pending.displayName.toLowerCase())) return;

    const field = embed.fields?.[0];
    if (!field?.value) return;

    const match = field.value.replace(/,/g, '').match(/\d+/);
    if (!match) return;

    const balance = parseInt(match[0]);
    if (isNaN(balance)) return;

    await this.tokenService.updateBalance(tokenIndex, balance);
    Logger.success(`💰 Balance: ${balance.toLocaleString()}`);
    this.awaitingBalanceResponse.delete(tokenIndex);
  }

  isRealSpawn(message) {
    if (!message.embeds?.length) return false;

    const embed = message.embeds[0];
    const text = (
      (embed.title || '') +
      ' ' +
      (embed.description || '')
    ).toLowerCase();

    return (
      text.includes('a wild pokémon has appeared') ||
      text.includes('guess the pokémon')
    );
  }

  async handleSpawn(message, tokenIndex, token) {
    if (this.starterService.starterLocks.has(tokenIndex)) {
  Logger.debug(`Starter in progress, skipping spawn`);
  return;
}
    const state = this.catchingState.get(tokenIndex);
    state.stats.spawnsDetected++;

    const embed = message.embeds[0];
    const imageUrl = embed.image?.url || embed.thumbnail?.url;
    
    if (!imageUrl) {
      Logger.debug('No spawn image');
      return;
    }

    Logger.info(`🎯 Spawn in #${message.channel.name}`);

    if (state.needsBalanceCheck) {
      await this.requestBalanceCheck(tokenIndex, message.channel);
      state.needsBalanceCheck = false;
    }

    try {
      const imageBuffer = await this.downloadImage(imageUrl);
      if (!imageBuffer) {
        Logger.warn('❌ Image download failed - skipping spawn');
        state.stats.catchFailed++;
        return;
      }

const aiResult = await this.aiService.predictPokemon(imageBuffer);
const aiLatency = aiResult.latency_ms ?? aiResult.latency ?? null;

const confidence = aiResult?.confidence || 0;

// ✅ FIXED: handle fail + low confidence
if (!aiResult?.success || !aiResult.pokemon || confidence < 65) {
  Logger.warn(`⚠️ AI failed/low confidence (${confidence}%) → using hint`);

  await this.safeSend(message.channel, `<@${this.poketwoId}> hint`);

  const filter = (m) =>
    m.author.id === this.poketwoId &&
    m.content.includes("The pokémon is");

  try {
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 5000,
    });

    const hintMsg = collected.first();
    if (!hintMsg) return;

    const results = await this.hintService.solve(hintMsg);

    if (!results || results.length === 0) {
      Logger.warn(`⚠️ Hint solve failed`);
      return;
    }

    const best = results[0];

    Logger.info(`🎯 Using best hint: ${best}`);

    await this.sleep(1200 + Math.random() * 1000);

    await this.safeSend(
      message.channel,
      `<@${this.poketwoId}> c ${best}`
    );

  } catch (err) {
    Logger.error(`❌ Hint fallback failed: ${err.message}`);
  }

  return;
}

const pokemonName = aiResult.pokemon.toLowerCase().trim();

const rarity = this.webhookService.getRarity(pokemonName);
Logger.info(
  `🔍 ${pokemonName} (${confidence.toFixed(2)}% confidence, ${aiLatency}ms)${
    rarity ? ` [${rarity}]` : ''
  }`
);

state.stats.catchAttempts++;

const channelId = message.channel.id;
state.pendingCatches.set(channelId, {
  pokemon: pokemonName,
  confidence,
  rarity,
  aiLatency,
  quotaRemaining: aiResult.quotaRemaining
});

state.lastCatch = {
  pokemon: pokemonName,
  confidence,
  rarity
};

      const delay = rarity 
        ? Math.floor(this.getRandomDelay() * 0.7)
        : this.getRandomDelay();
      
      Logger.info(`⏳ Delay: ${(delay/1000).toFixed(1)}s${rarity ? ' (rare)' : ''}`);
      await this.sleep(delay);

      await this.safeSend(message.channel, `<@${this.poketwoId}> c ${pokemonName}`);

      Logger.success(`✅ Catch sent: "${pokemonName}"`);

    } catch (error) {
      Logger.error(`❌ Spawn failed: ${error.message}`);
      state.stats.catchFailed++;
    }
  }

async handleWrongGuess(message, tokenIndex, token) {
  const state = this.catchingState.get(tokenIndex);
  if (!state) return;

  const channelId = message.channel.id;
  const retries = state.retryMap.get(channelId) || 0;

  if (retries >= 2) {
    Logger.warn(`⛔ Max retries reached`);
    return;
  }

  state.retryMap.set(channelId, retries + 1);

  Logger.warn(`❌ Wrong guess → switching to hint`);

  await this.safeSend(message.channel, `<@${this.poketwoId}> hint`);

  const filter = (m) =>
    m.author.id === this.poketwoId &&
    m.content.includes("The pokémon is");

  try {
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 5000,
    });

    const hintMsg = collected.first();
    if (!hintMsg) return;

    const results = await this.hintService.solve(hintMsg);

    if (!results || results.length === 0) {
      Logger.warn(`⚠️ Hint solve failed`);
      return;
    }

    const name = results[0];

    Logger.info(`🔁 Retrying with hint: ${name}`);

    await this.sleep(1200 + Math.random() * 1000);

    await this.safeSend(
      message.channel,
      `<@${this.poketwoId}> c ${name}`
    );

  } catch (err) {
    Logger.error(`❌ Hint fallback failed: ${err.message}`);
  }
}

  async requestBalanceCheck(tokenIndex, channel) {
    const token = this.tokenService.getToken(tokenIndex);
    if (!token || !channel?.send) return;

    const displayName =
      token.client?.user?.displayName ||
      token.client?.user?.globalName ||
      token.username;

    Logger.info(`💰 Requesting balance`);
    this.awaitingBalanceResponse.set(tokenIndex, {
      displayName,
      requestedAt: Date.now()
    });

    await this.safeSend(channel, `<@${this.poketwoId}> bal`);

    setTimeout(() => {
      if (this.awaitingBalanceResponse.has(tokenIndex)) {
        Logger.warn(`⏱️ Balance timeout`);
        this.awaitingBalanceResponse.delete(tokenIndex);
      }
    }, 10000);
  }

async handleCaptcha(message, token, tokenIndex) {
  const state = this.catchingState.get(tokenIndex);
  if (!state) return;

  state.stats.captchaDetected++;

  Logger.warn(`🔒 Captcha detected`);

  if (!state.lastIncP || Date.now() - state.lastIncP > 30000) {
    try {
      await this.safeSend(message.channel, `<@${this.poketwoId}> inc p`);
      state.lastIncP = Date.now();
      Logger.info(`📤 Sent "inc p" before pausing`);
    } catch (err) {
      Logger.error(`❌ Failed to send inc p: ${err.message}`);
    }
  } else {
    Logger.debug(`⏱️ Skipped inc p (cooldown active)`);
  }

  await this.pauseCatching(tokenIndex, 'captcha');

  if (!this.captchaService?.isAvailable?.()) {
    Logger.warn('Captcha service unavailable');
    return;
  }

  try {
    const solution = await this.captchaService.solveCaptcha({
      token: token.token,
      userId: token.userId,
      username: token.username,
      client: token.client
    });

    if (solution) {
      Logger.success(`✅ Captcha auto-bypassed`);

      setTimeout(async () => {
        await this.resumeCatching(tokenIndex);

        const stateAfter = this.catchingState.get(tokenIndex);
        if (!stateAfter) return;

        if (!stateAfter.lastIncR || Date.now() - stateAfter.lastIncR > 30000) {
          try {
            await this.safeSend(message.channel, `<@${this.poketwoId}> inc r`);
            stateAfter.lastIncR = Date.now();
            Logger.info(`📤 Sent "inc r" after resume`);
          } catch (err) {
            Logger.error(`❌ Failed to send inc r: ${err.message}`);
          }
        } else {
          Logger.debug(`⏱️ Skipped inc r (cooldown active)`);
        }

      }, 3000);

    } else {
      Logger.error('❌ Captcha solve failed');
      Logger.info(`⏸️ Still paused - manual resume required`);
    }

  } catch (error) {
    Logger.error(`❌ Captcha error: ${error.message}`);
    Logger.info(`⏸️ Still paused - manual resume required`);
  }
}

  getStatus(tokenIndex) {
    const state = this.catchingState.get(tokenIndex);
    const reason = this.pauseReasons.get(tokenIndex);
    const token = this.tokenService.getToken(tokenIndex);
    
    return {
      active: state?.active || false,
      paused: state?.isPaused || false,
      pauseReason: reason || null,
      mode: state?.mode || null,
      autoClick: this.autoClickState.get(tokenIndex) ?? false,
      username: token?.username || 'Unknown',
      stats: state?.stats || {}
    };
  }

  getCatchingState() {
    const activeCatchers = this.getActiveCatchers();
    return {
      active: activeCatchers.length,
      total: this.tokenService.getAllTokens().length,
      running: activeCatchers.length > 0,
      catchers: activeCatchers
    };
  }

  getActiveCatchers() {
    return Array.from(this.catchingState.entries())
      .filter(([, state]) => state.active)
      .map(([index, state]) => {
        const token = this.tokenService.getToken(index);
        const reason = this.pauseReasons.get(index);
        return {
          index,
          username: token?.username || 'Unknown',
          mode: state.mode,
          autoClick: this.autoClickState.get(index) ?? false,
          status: state.isPaused ? `PAUSED (${reason})` : 'ACTIVE',
          uptime: ((Date.now() - state.stats.startTime) / 1000 / 60).toFixed(1) + 'm',
          stats: state.stats
        };
      });
  }

  async stopAll() {
    const stopped = [];
    for (const [index] of this.catchingState.entries()) {
      const result = await this.stopCatching(index);
      if (result.success) stopped.push(result.username);
    }
    return stopped;
  }
}

module.exports = AutocatcherService;
