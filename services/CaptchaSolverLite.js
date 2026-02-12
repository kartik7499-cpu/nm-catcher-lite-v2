const http = require('http');
const axios = require('axios');
const Logger = require('../utils/logger');

class CaptchaSolver {
  constructor(bot) {
    this.bot = bot;
    this.apiHostname = process.env.CAPTCHA_API_HOSTNAME;
    this.apiPort = process.env.CAPTCHA_API_PORT;
    this.apiKey = process.env.CAPTCHA_API_KEY;
    this.webhook = process.env.CAPTCHA_LOGGING_WEBHOOK;
  }

  isAvailable() {
    return !!this.apiKey;
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

    return new Promise((resolve) => {
      const startTime = Date.now();

      Logger.warn(`🔒 CAPTCHA DETECTED for ${tokenData.username}`);

      this.sendWebhook({
        title: '🔒 Captcha Detected',
        description:
          `**Account:** ${tokenData.username}\n` +
          `**UserID:** ${tokenData.userId}\n` +
          `**Status:** Solver started`,
        color: 0xffa500,
        timestamp: new Date().toISOString()
      });

      const data = JSON.stringify({
        uid: tokenData.userId,
        token: tokenData.token
      });

      const options = {
        hostname: this.apiHostname,
        port: this.apiPort,
        path: '/solve-captcha',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'x-license-key': this.apiKey
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => (responseData += chunk));

        res.on('end', () => {
          const durationMs = Date.now() - startTime;
          const timeTaken = (durationMs / 1000).toFixed(2);

          Logger.debug(`Captcha API RAW (${timeTaken}s): ${responseData}`);

          try {
            const json = JSON.parse(responseData);

            if (
              json.status === true &&
              json.message === 'Captcha solved successfully'
            ) {
              Logger.success(
                `✅ Captcha auto-bypassed for ${tokenData.username} (${timeTaken}s)`
              );

              this.sendWebhook({
                title: '✅ Captcha Solved',
                description:
                  `**Account:** ${tokenData.username}\n` +
                  `**Time:** ${timeTaken}s\n` +
                  `**Method:** Server-side bypass`,
                color: 0x00ff00,
                timestamp: new Date().toISOString()
              });

              resolve('CAPTCHA_BYPASSED');
              return;
            }

            Logger.error(
              `❌ Captcha API failed: ${json.message || 'Unknown response'}`
            );
            resolve(null);
          } catch (err) {
            Logger.error(`Captcha parse error: ${err.message}`);
            Logger.debug(`Raw response: ${responseData}`);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        Logger.error(`Captcha network error: ${error.message}`);
        resolve(null);
      });

      req.setTimeout(35000, () => {
        req.destroy();
        Logger.error(`Captcha timeout (35s)`);
        resolve(null);
      });

      req.write(data);
      req.end();
    });
  }
}

module.exports = CaptchaSolver;
