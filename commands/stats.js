const axios = require('axios');
const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'stats',
  description: 'View global and account statistics',
  usage: '.stats',

  async execute(message, args, bot) {
    try {
      const tokenService = bot.tokenService;
      const autocatcherService = bot.autocatcherService;

      if (args.length > 0) {
        const index = parseInt(args[0], 10);
        return await showAccountStats(message, index, tokenService, autocatcherService);
      }

      await showGlobalStats(message, tokenService, autocatcherService, bot);

    } catch (error) {
      Logger.error('Error in stats command:', error);
      const embed = EmbedHandler.createErrorEmbed(
        'Error',
        'Failed to fetch statistics.'
      );
      await message.reply({ embeds: [embed] });
    }
  }
};

async function showGlobalStats(message, tokenService, autocatcherService, bot) {
  const tokens = tokenService.getAllTokens();
  const activeCatchers = autocatcherService.getActiveCatchers();

  let totalSpawns = 0;
  let totalAttempts = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const catcher of activeCatchers) {
    const state = autocatcherService.getCatchingState(catcher.index);
    if (state?.stats) {
      totalSpawns += state.stats.spawnsDetected || 0;
      totalAttempts += state.stats.catchAttempts || 0;
      totalSuccess += state.stats.catchSuccess || 0;
      totalFailed += state.stats.catchFailed || 0;
    }
  }

  const successRate =
    totalAttempts > 0
      ? ((totalSuccess / totalAttempts) * 100).toFixed(2)
      : '0.00';

  const aiStatus = bot.aiService.isAvailable() ? 'Available' : 'Offline';

  let captchaStatus = 'Offline';

  try {
    const res = await axios.get('http://194.58.66.199:6973', { timeout: 3000 });
    if (typeof res.data === 'string' && res.data.toLowerCase().includes('hello')) {
      captchaStatus = 'Available';
    }
  } catch {
    captchaStatus = 'Offline';
  }

  let predictQuota = 'Unknown';

  const apiUrl = process.env.PREDICTION_API_URL;
  const apiKey = process.env.PREDICTION_API_KEY;

  if (apiUrl && apiKey) {
    try {
      const res = await axios.get(`${apiUrl}/balance`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 5000
      });

      if (res.data?.success) {
        const remaining = Number(res.data.remaining) || 0;
        const limit = Number(res.data.limit) || 0;
        const used = Number(res.data.used) || 0;

        predictQuota =
          `${remaining.toLocaleString()} / ${limit.toLocaleString()} ` +
          `(${used.toLocaleString()} used)`;
      }
    } catch {}
  }

  let totalBalance = 0;
  const balances = [];

  for (const token of tokens) {
    const balance = token.balance || 0;
    totalBalance += balance;
    balances.push(`${token.username || 'Unknown'}  -->  ${balance.toLocaleString()}`);
  }

  const description = [
    '```ini',
    'Global Statistics',
    `Total Accounts: ${tokens.length}`,
    '',
    'Global Catching Stats',
    `Active Catchers: ${activeCatchers.length}/${tokens.length}`,
    `Total Spawns: ${totalSpawns}`,
    `Total Attempts: ${totalAttempts}`,
    `Successful:  ${totalSuccess}`,
    `Failed:      ${totalFailed}`,
    `Success Rate: ${successRate}%`,
    '```',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '```yaml',
    'System Info',
    `AI Service:  ${aiStatus}`,
    `Captcha Solver:  ${captchaStatus}`,
    `Prediction Quota: ${predictQuota}`,
    '```',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '```fix',
    'Balances',
    ...(balances.length ? balances : ['No accounts']),
    '```',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '```css',
    `Total  -->  ${totalBalance.toLocaleString()} Pokécoins`,
    '```'
  ].join('\n');

  const embed = EmbedHandler.createInfoEmbed('📊 NM Catcher Lite v2', description);
  embed.setFooter({
    text: 'NM Catcher Lite • Stats Dashboard',
    iconURL:
      'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
  });
  embed.setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function showAccountStats(message, index, tokenService, autocatcherService) {
  const token = tokenService.getToken(index);

  if (!token) {
    const embed = EmbedHandler.createErrorEmbed(
      'Invalid Index',
      `Account #${index} not found.`
    );
    return message.reply({ embeds: [embed] });
  }

  const state = autocatcherService.getCatchingState(index);

  const stats = state?.stats || {
    spawnsDetected: 0,
    catchAttempts: 0,
    catchSuccess: 0,
    catchFailed: 0,
    captchaDetected: 0
  };

  const successRate =
    stats.catchAttempts > 0
      ? ((stats.catchSuccess / stats.catchAttempts) * 100).toFixed(2)
      : '0.00';

  const uptime =
    state?.active && stats.startTime
      ? getUptime(stats.startTime)
      : 'Not active';

  const embed = EmbedHandler.createInfoEmbed(
    `📊 Account #${index} Statistics`,
    `**Username:** ${token.username || 'Unknown'}`
  );

  embed.addFields({
    name: '⚔️ Catching Stats',
    value:
      `**Status:** ${state?.active ? '🟢 Active' : '🔴 Inactive'}\n` +
      `**Mode:** ${state?.mode?.toUpperCase() || 'N/A'}\n` +
      `**Uptime:** ${uptime}\n` +
      `**Spawns:** ${stats.spawnsDetected}\n` +
      `**Attempts:** ${stats.catchAttempts}\n` +
      `**Success:** ✅ ${stats.catchSuccess}\n` +
      `**Failed:** ❌ ${stats.catchFailed}\n` +
      `**Success Rate:** ${successRate}%\n` +
      `**Captchas:** 🔐 ${stats.captchaDetected}`,
    inline: false
  });

  embed.setFooter({ text: `Account #${index}` });
  embed.setTimestamp();

  await message.reply({ embeds: [embed] });
}

function getUptime(startTime) {
  const diff = Date.now() - new Date(startTime);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}
