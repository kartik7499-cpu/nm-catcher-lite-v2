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
      await axios.post(this.webhook, {
        embeds: [embed]
      });
    } catch (e) {
      Logger.error(
        `Captcha webhook failed: ${e.message}`
      );
    }
  }

  async solveCaptcha(tokenData) {
    if (!this.isAvailable()) {
      Logger.warn(
        'Captcha API not configured'
      );

      return null;
    }

    const startTime = Date.now();

    const username =
      tokenData?.client?.user?.username ||
      tokenData?.username ||
      'unknown';

    Logger.warn(
      `🔒 CAPTCHA DETECTED for ${username}`
    );

    await this.sendWebhook({
      title: '🚨 CAPTCHA DETECTED',
      description:
        `**Account:** ${username}\n` +
        `**Status:** Waiting for solver`,
      color: 0xff0000,
      timestamp: new Date().toISOString()
    });

    try {
      const payload = {
        licenseKey: this.apiKey,
        username:
          tokenData?.client?.user
            ?.username ||
          tokenData?.username,
        token: tokenData?.token,
        userID:
          tokenData?.client?.user?.id ||
          tokenData?.userId
      };

      const response = await axios.post(
        this.solveUrl,
        payload,
        {
          timeout: 250000,

          headers: {
            'Content-Type':
              'application/json',

            'x-license-key':
              this.apiKey
          }
        }
      );

      const data = response.data || {};

      const timeTaken = (
        (Date.now() - startTime) /
        1000
      ).toFixed(2);

      Logger.debug(
        `Captcha API response: ${JSON.stringify(
          data
        )}`
      );

      const success =
        data.success ||
        (Array.isArray(data.result) &&
          data.result.length > 0);

      if (success) {
        Logger.success(
          `✅ Captcha solved for ${username} (${timeTaken}s)`
        );

        await this.sendWebhook({
          title: '✅ CAPTCHA SOLVED',
          description:
            `**Account:** ${username}\n` +
            `**Time:** ${timeTaken}s\n` +
            `**Remaining:** ${
              data.remaining ?? 'N/A'
            }`,
          color: 0x00ff00,
          timestamp:
            new Date().toISOString()
        });

        return 'CAPTCHA_BYPASSED';
      }

      Logger.error(
        `❌ Captcha failed: ${
          data.error ||
          'Unknown response'
        }`
      );

      await this.sendWebhook({
        title: '❌ CAPTCHA FAILED',
        description:
          `**Account:** ${username}\n` +
          `**Error:** ${
            data.error ||
            'Unknown response'
          }`,
        color: 0xff0000,
        timestamp:
          new Date().toISOString()
      });

      return null;
    } catch (error) {
      Logger.error(
        `Captcha error: ${error.message}`
      );

      await this.sendWebhook({
        title: '❌ CAPTCHA ERROR',
        description:
          `**Account:** ${username}\n` +
          `**Error:** ${error.message}`,
        color: 0xff0000,
        timestamp:
          new Date().toISOString()
      });

      return null;
    }
  }

  async checkUsage() {
    return {
      success: false,
      error:
        'Not supported on this endpoint'
    };
  }
}

module.exports = CaptchaSolver;
