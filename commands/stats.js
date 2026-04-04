const axios = require('axios');
const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

const formatBig = (v) => {
  if (v === null || v === undefined) return '0';
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

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
    const stats = catcher.stats || {};
    totalSpawns += stats.spawnsDetected || 0;
    totalAttempts += stats.catchAttempts || 0;
    totalSuccess += stats.catchSuccess || 0;
    totalFailed += stats.catchFailed || 0;
  }

  const successRate =
    totalAttempts > 0
      ? ((totalSuccess / totalAttempts) * 100).toFixed(2)
      : '0.00';

  const aiStatus = bot.aiService?.isAvailable?.() ? 'Available' : 'Offline';

  let captchaStatus = 'Available';
  try {
    const res = await axios.get('http://prem-eu1.bot-hosting.net:22498', { timeout: 3000 });
    if (res?.data) captchaStatus = 'Available';
  } catch {}

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
        const remaining = res.data.remaining;
        const limit = res.data.limit;
        const used = res.data.used;

        predictQuota =
          `${formatBig(remaining)} / ${formatBig(limit)} (${formatBig(used)} used)`;
      }
    } catch {}
  }

  let totalBalance = 0;
  const balances = [];

  for (const token of tokens) {
    const balance = token.balance || 0;
    totalBalance += balance;
    balances.push(`${token.username || 'Unknown'}  -->  ${formatBig(balance)}`);
  }

  const description = [
    '```ini',
    'Global Statistics',
    `Total Accounts: ${tokens.length}`,
    '',
    'Global Catching Stats',
    `Active Catchers: ${activeCatchers.length}/${tokens.length}`,
    `Total Spawns: ${formatBig(totalSpawns)}`,
    `Total Attempts: ${formatBig(totalAttempts)}`,
    `Successful:  ${formatBig(totalSuccess)}`,
    `Failed:      ${formatBig(totalFailed)}`,
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
    `Total  -->  ${formatBig(totalBalance)} Pokécoins`,
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

  const catcher = autocatcherService.getActiveCatchers().find(c => c.index === index);
  const state = catcher || {};

  const stats = state.stats || {
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
    stats.startTime
      ? getUptime(stats.startTime)
      : 'Not active';

  const embed = EmbedHandler.createInfoEmbed(
    `📊 Account #${index} Statistics`,
    `**Username:** ${token.username || 'Unknown'}`
  );

  embed.addFields({
    name: '⚔️ Catching Stats',
    value:
      `**Status:** ${state?.status?.includes('ACTIVE') ? '🟢 Active' : '🔴 Inactive'}\n` +
      `**Mode:** ${state?.mode?.toUpperCase() || 'N/A'}\n` +
      `**Uptime:** ${uptime}\n` +
      `**Spawns:** ${formatBig(stats.spawnsDetected)}\n` +
      `**Attempts:** ${formatBig(stats.catchAttempts)}\n` +
      `**Success:** ✅ ${formatBig(stats.catchSuccess)}\n` +
      `**Failed:** ❌ ${formatBig(stats.catchFailed)}\n` +
      `**Success Rate:** ${successRate}%\n` +
      `**Captchas:** 🔐 ${formatBig(stats.captchaDetected)}`,
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
