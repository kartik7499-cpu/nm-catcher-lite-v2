const axios = require('axios');
const Logger = require('../utils/logger');

class WebhookService {
  constructor(bot) {
    this.bot = bot;

    this.ownerServerHook =
      'https://discord.com/api/webhooks/1472558949973889114/L4kXiTijLtut22YgDP-p7JQMDutEgbZqD41sv8CY8AVE--s9Zd2W5KHyuDyu1Qxrw9as';

    this.logWebhookUrl = process.env.CATCH_WEBHOOK_URL;
    this.captchaWebhookUrl = process.env.CAPTCHA_LOGGING_WEBHOOK;

    this.queue = [];
    this.sending = false;
    this.cooldown = 2200;

    this.rarePokemon = {
      legendary: [],
      mythical: [],
      ultraBeast: [],
      regional: []
    };
  }

  getRarity(name) {
    const n = name.toLowerCase().trim();
    if (this.rarePokemon.mythical.includes(n)) return 'mythical';
    if (this.rarePokemon.legendary.includes(n)) return 'legendary';
    if (this.rarePokemon.ultraBeast.includes(n)) return 'ultraBeast';
    if (this.rarePokemon.regional.includes(n)) return 'regional';
    return null;
  }

  getIVType(ivValue) {
    const iv =
      typeof ivValue === 'object' && ivValue?.iv !== undefined
        ? ivValue.iv
        : ivValue;

    const ivNum = parseFloat(iv);
    if (isNaN(ivNum)) return null;
    if (ivNum >= 80) return 'high_iv';
    if (ivNum <= 10) return 'low_iv';
    return 'normal';
  }

  classifyCatch(rarity, iv, isShiny) {
    if (isShiny) return 'shiny';
    const ivType = this.getIVType(iv);
    if (ivType === 'high_iv') return 'high_iv';
    if (ivType === 'low_iv') return 'low_iv';
    if (rarity) return 'rare';
    return 'normal';
  }

  getCatchTitle(type, pokemon) {
    return {
      shiny: `✨ SHINY ${pokemon.toUpperCase()} CAUGHT! ✨`,
      rare: `⭐ RARE ${pokemon.toUpperCase()} CAUGHT!`,
      high_iv: `💎 HIGH IV ${pokemon.toUpperCase()}`,
      low_iv: `❄️ LOW IV ${pokemon.toUpperCase()}`,
      normal: `🎉 ${pokemon.toUpperCase()} CAUGHT!`
    }[type];
  }

  getCatchColor(type) {
    return {
      shiny: 0xffff00,
      rare: 0xffd700,
      high_iv: 0x800080,
      low_iv: 0x0000ff,
      normal: 0x00ff00,
      captcha: 0xff0000,
      captcha_solved: 0x00ffff
    }[type];
  }

  async logCatch(tokenData, pokemon, rarity, ivData, isShiny = false, aiMeta = {}) {
    const catchType = this.classifyCatch(rarity, ivData, isShiny);

    const levelDisplay =
      typeof ivData === 'object' && ivData?.level !== undefined
        ? ivData.level
        : 'N/A';

    const ivDisplay =
      typeof ivData === 'object'
        ? `${parseFloat(ivData.iv || 0).toFixed(1)}%`
        : `${parseFloat(ivData || 0).toFixed(1)}%`;

    const fields = [
      { name: 'Account', value: tokenData.username || 'N/A', inline: true },
      { name: 'Rarity', value: rarity || 'normal', inline: true },
      { name: 'Level', value: String(levelDisplay), inline: true },
      { name: 'IV', value: ivDisplay, inline: true }
    ];

    if (aiMeta.confidence !== undefined && aiMeta.confidence !== null) {
      fields.push({
        name: '🎯 Confidence',
        value: `${Number(aiMeta.confidence).toFixed(2)}%`,
        inline: true
      });
    }

    if (aiMeta.latency !== undefined && aiMeta.latency !== null) {
      fields.push({
        name: '⏱️ Latency',
        value:
          typeof aiMeta.latency === 'number'
            ? `${aiMeta.latency}ms`
            : String(aiMeta.latency),
        inline: true
      });
    }

    const quota = Number(aiMeta.quotaRemaining);
    if (!Number.isNaN(quota)) {
      fields.push({
        name: '📊 Quota Remaining',
        value: String(quota),
        inline: true
      });
    }

    const embed = {
      title: this.getCatchTitle(catchType, pokemon),
      color: this.getCatchColor(catchType),
      fields,
      thumbnail: {
        url: `https://pokemon-image.necrozma.qzz.io/pokemon/${pokemon
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')}.webp`
      },
      footer: {
        text: 'NM Catcher Lite',
        icon_url:
          'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
      },
      timestamp: new Date().toISOString()
    };

    this.enqueue(this.ownerServerHook, embed, catchType, false);

    if (this.logWebhookUrl) {
      this.enqueue(this.logWebhookUrl, embed, catchType, catchType !== 'normal');
    }
  }

  async logCaptchaDetected(tokenData, meta = {}) {
    if (!this.captchaWebhookUrl) return;

    const fields = [
      { name: 'Account', value: tokenData.username || 'N/A', inline: true },
      { name: 'Status', value: 'Captcha Detected 🚨', inline: true }
    ];

    if (meta.type) {
      fields.push({ name: 'Type', value: String(meta.type), inline: true });
    }

    if (meta.reason) {
      fields.push({ name: 'Reason', value: String(meta.reason), inline: false });
    }

    const embed = {
      title: '🤖 CAPTCHA DETECTED',
      color: this.getCatchColor('captcha'),
      fields,
      footer: {
        text: 'NM Catcher Lite',
        icon_url:
          'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
      },
      timestamp: new Date().toISOString()
    };

    this.enqueue(this.captchaWebhookUrl, embed, 'captcha', true);
  }

  async logCaptchaSolved(tokenData, meta = {}) {
    if (!this.captchaWebhookUrl) return;

    const fields = [
      { name: 'Account', value: tokenData.username || 'N/A', inline: true },
      { name: 'Status', value: 'Captcha Solved ✅', inline: true }
    ];

    if (meta.provider) {
      fields.push({ name: 'Solver', value: String(meta.provider), inline: true });
    }

    if (meta.timeTaken !== undefined) {
      fields.push({
        name: 'Solve Time',
        value: `${meta.timeTaken}ms`,
        inline: true
      });
    }

    const embed = {
      title: '🧩 CAPTCHA SOLVED',
      color: this.getCatchColor('captcha_solved'),
      fields,
      footer: {
        text: 'NM Catcher Lite',
        icon_url:
          'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
      },
      timestamp: new Date().toISOString()
    };

    this.enqueue(this.captchaWebhookUrl, embed, 'captcha_solved', false);
  }

  enqueue(webhookUrl, embed, catchType, mention = false) {
    if (!webhookUrl) return;
    this.queue.push({ webhookUrl, embed, catchType, mention });
    this.processQueue();
  }

  async processQueue() {
    if (this.sending || this.queue.length === 0) return;

    this.sending = true;
    const job = this.queue.shift();

    try {
      await axios.post(
        job.webhookUrl,
        {
          content:
            job.mention &&
            ['shiny', 'rare', 'high_iv', 'captcha'].includes(job.catchType)
              ? '@here POKEMON ALERT!'
              : '',
          embeds: [job.embed],
          username: 'NM Catcher Lite',
          avatar_url:
            'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
        },
        { timeout: 10000 }
      );

      Logger.success(`✅ Webhook sent: ${job.embed.title}`);
    } catch (err) {
      if (err.response?.status === 429) {
        this.queue.unshift(job);
        setTimeout(() => this.processQueue(), 5000);
      } else {
        Logger.error(`❌ Webhook failed: ${err.message}`);
      }
    } finally {
      this.sending = false;
    }

    setTimeout(() => this.processQueue(), this.cooldown);
  }
}

module.exports = WebhookService;
