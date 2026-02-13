const axios = require('axios');
const EmbedHandler = require('../utils/EmbedHandler');

function formatSmart(value) {
  if (value === null || value === undefined) return 'Unknown';

  try {
    const n = BigInt(value);

    if (n >= 1000000000000000000n) return '∞ Unlimited';
    if (n >= 1000000000000n) return `${Number(n / 1000000000000n)}T`;
    if (n >= 1000000000n) return `${Number(n / 1000000000n)}B`;
    if (n >= 1000000n) return `${Number(n / 1000000n)}M`;
    if (n >= 1000n) return `${Number(n / 1000n)}K`;

    return Number(n).toLocaleString();
  } catch {
    return String(value);
  }
}

module.exports = {
  name: 'stats',
  description: 'Bot statistics',
  usage: '.stats',
  category: 'Status',
  aliases: ['info'],

  async execute(message, args, bot) {
    const tokens = bot.tokenService.getAllTokens();
    const activeCatchers = bot.autocatcherService.getActiveCatchers();

    let totalSpawns = 0;
    let totalCatches = 0;

    for (const catcher of activeCatchers) {
      const state = bot.autocatcherService.getCatchingState(catcher.index);
      totalSpawns += state?.stats?.spawnsDetected || 0;
      totalCatches += state?.stats?.catchSuccess || 0;
    }

    let aiAvailable = false;
    let predictQuotaText = 'Unknown';

    const apiUrl = process.env.PREDICTION_API_URL;
    const apiKey = process.env.PREDICTION_API_KEY;

    if (apiUrl) {
      try {
        const res = await axios.get(`${apiUrl}/api-status`, { timeout: 3000 });
        aiAvailable = res.data?.status === 'online';
      } catch {
        aiAvailable = false;
      }
    }

    if (apiUrl && apiKey) {
      try {
        const res = await axios.get(`${apiUrl}/balance`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 5000
        });

        if (res.data?.success) {
          const remaining = res.data.remaining;
          const limit = res.data.limit;
          const used = res.data.used;

          predictQuotaText =
            `${formatSmart(remaining)} / ${formatSmart(limit)} ` +
            `(${formatSmart(used)} used)`;
        }
      } catch {
        predictQuotaText = 'Unknown';
      }
    }

    let captchaAvailable = false;

    try {
      const res = await axios.get('http://194.58.66.199:6973', { timeout: 3000 });
      if (typeof res.data === 'string' && res.data.toLowerCase().includes('hello')) {
        captchaAvailable = true;
      }
    } catch {
      captchaAvailable = false;
    }

    let totalBalance = 0;
    const balanceLines = [];

    for (const token of tokens) {
      const balance = token.balance || 0;
      totalBalance += balance;
      balanceLines.push(
        `\`${token.username}\` → **${balance.toLocaleString()}**`
      );
    }

    const embed = EmbedHandler.createInfoEmbed(
      '📊 NM Catcher Lite Stats',
      [
        `**Accounts:** ${tokens.length} | **Active:** ${activeCatchers.length}`,
        `**Spawns:** ${totalSpawns} | **Catches:** ${totalCatches}`,
        '',
        '**System Info**',
        `🤖 AI Service: ${aiAvailable ? '✅ Available' : '❌ Unavailable'}`,
        `📊 Prediction Quota: ${predictQuotaText}`,
        `🔐 Captcha Service: ${captchaAvailable ? '✅ Available' : '❌ Unavailable'}`,
        '',
        '**Balances**',
        balanceLines.length ? balanceLines.join('\n') : 'No accounts',
        '',
        `**Total → ${totalBalance.toLocaleString()} Pokécoins**`
      ]
    );

    await message.reply({ embeds: [embed] });
  }
};
