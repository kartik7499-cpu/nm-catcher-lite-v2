const axios = require('axios');
const Logger = require('../utils/logger');

class CaptchaSolver {
  constructor(bot) {
    this.bot = bot;
    this.baseUrl = process.env.CAPTCHA_API_BASE;
    this.apiKey = process.env.CAPTCHA_API_KEY;
    this.webhook = process.env.CAPTCHA_LOGGING_WEBHOOK;

    this.solveUrl = this.baseUrl
      ? this.baseUrl.replace(/\/$/, '') + '/solve'
      : null;
  }

  isAvailable() {
    return !!this.solveUrl && !!this.apiKey;
  }

  async sendWebhook(embed) {
    if (!this.webhook) return;
    try {
      await axios.post(this.webhook, { embeds: [embed] });
    } catch (e) {
      Logger.error(`Captcha webhook failed: ${e.message}`);
    }
  }

  async solveCaptcha(_, tokenData) {
    if (!this.isAvailable()) {
      Logger.warn('Captcha API not configured');
      return null;
    }

    const startTime = Date.now();

    Logger.warn(`🔒 CAPTCHA DETECTED for ${tokenData.username}`);

    try {
      const payload = {
        licenseKey: this.apiKey,
        username:
          tokenData.client?.user?.username ||
          tokenData.username ||
          'unknown',
        token: tokenData.token,
        userID: tokenData.userId
      };

      const response = await axios.post(this.solveUrl, payload, {
        timeout: 180000 // 180s like original script
      });

      const data = response.data || {};
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

      Logger.debug(`Captcha API response: ${JSON.stringify(data)}`);

      // ✅ NEW API FORMAT
      if (data.success) {
        Logger.success(
          `✅ Captcha solved for ${tokenData.username} (${timeTaken}s)`
        );

        this.sendWebhook({
          title: '✅ Captcha Solved',
          description:
            `**Account:** ${tokenData.username}\n` +
            `**Time:** ${timeTaken}s\n` +
            `**Remaining:** ${data.remaining ?? 'N/A'}`,
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        });

        return 'CAPTCHA_BYPASSED';
      }

      Logger.error(
        `❌ Captcha failed: ${data.error || 'Unknown response'}`
      );
      return null;

    } catch (error) {
      Logger.error(`Captcha error: ${error.message}`);
      return null;
    }
  }

  async checkUsage() {
    return { success: false, error: 'Not supported on this endpoint' };
  }
}

module.exports = CaptchaSolver;