const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
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
  name: 'api',
  aliases: ['ai', 'balance', 'key'],
  description: 'Check AI Prediction API key balance & details',

  async execute(message, args, bot) {
    try {
      const apiKey = process.env.PREDICTION_API_KEY;
      const apiUrl =
        process.env.PREDICTION_API_URL || 'https://api.nmcatcher.ai/predict';

      if (!apiKey) {
        const embed = EmbedHandler.createErrorEmbed(
          'API Key Missing',
          '❌ `PREDICTION_API_KEY` not set in .env\nAdd your NM Catcher AI key to enable!'
        );
        return message.reply({ embeds: [embed] });
      }

      const response = await axios.get(`${apiUrl}/balance`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 5000
      });

      const data = response.data;
      if (!data.success) throw new Error(data.error || 'API error');

      const safeRemaining = data.remaining;

      const embed = new EmbedBuilder()
        .setTitle('🤖 AI Prediction API Balance')
        .setColor(
          data.exhausted
            ? 0xff0000
            : safeRemaining > 10
            ? 0x00ff00
            : 0xffff00
        )
        .addFields(
          { name: '📊 Limit', value: formatSmart(data.limit), inline: true },
          { name: '✅ Used', value: formatSmart(data.used), inline: true },
          { name: '🎯 Remaining', value: formatSmart(safeRemaining), inline: true },
          { name: '⚠️ Status', value: data.exhausted ? '❌ **EXHAUSTED**' : '✅ Active', inline: false }
        )
        .addFields(
          {
            name: '📅 Created',
            value: data.created_at
              ? new Date(data.created_at).toLocaleString('en-IN')
              : 'Unknown',
            inline: true
          }
        )
        .setFooter({
          text: `AI API SYSTEM BY YAKUZA & GANG`,
          icon_url:
            'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
        })
        .setTimestamp();

      if (safeRemaining <= 10 && !data.exhausted) {
        embed.setDescription('⚠️ **Low balance warning!** Add credits soon.');
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      let errorMsg = 'Unknown error';

      if (error.code === 'ECONNABORTED') errorMsg = '⏱️ API timeout (5s)';
      else if (error.response?.status === 401) errorMsg = '❌ Invalid API key';
      else if (error.response?.status === 404) errorMsg = '❌ /balance endpoint not found';
      else if (error.response?.data?.error) errorMsg = error.response.data.error;
      else errorMsg = error.message;

      const embed = EmbedHandler.createErrorEmbed(
        'API Check Failed',
        `**\`${errorMsg}\`** \nTry: \`${bot.config.prefix}api\``
      );

      await message.reply({ embeds: [embed] });
    }
  }
};
