const fs = require('fs');
const path = require('path');
const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'remove',
  description: 'Remove token(s) by index',
  usage: '.remove <index | multiple | all>',
  category: 'Token',
  aliases: ['rm', 'delete', 'del'],

  async execute(message, args, bot) {

    if (!args.length) {
      return message.reply({
        embeds: [EmbedHandler.createErrorEmbed(
          'Missing Argument',
          `**Usage:** \`${bot.config.prefix}remove <index | multiple | all>\`\nExample: \`${bot.config.prefix}remove 1 2 3\` or \`${bot.config.prefix}remove all\``
        )]
      });
    }

    const dataDir = path.join(__dirname, '../data');
    const usedPath = path.join(dataDir, 'used.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(usedPath)) {
      fs.writeFileSync(usedPath, JSON.stringify([], null, 2));
    }

    let usedTokens = [];
    try {
      usedTokens = JSON.parse(fs.readFileSync(usedPath, 'utf8'));
    } catch {
      usedTokens = [];
    }

    const allTokens = bot.tokenService.tokens;

    if (args[0].toLowerCase() === 'all') {

      if (!allTokens.length) {
        return message.reply({
          embeds: [EmbedHandler.createErrorEmbed('No Tokens', 'Nothing to remove')]
        });
      }

      const loading = await message.reply({
        embeds: [EmbedHandler.createLoadingEmbed(`🗑️ Removing ALL tokens (${allTokens.length})...`)]
      });

      const tokensToSave = allTokens.map(t => t.token);
      usedTokens.push(...tokensToSave);

      fs.writeFileSync(usedPath, JSON.stringify(usedTokens, null, 2));

      let removed = 0;

      for (let i = allTokens.length - 1; i >= 0; i--) {
        const res = await bot.tokenService.removeToken(i);
        if (res.success) removed++;
      }

      await loading.edit({
        embeds: [EmbedHandler.createSuccessEmbed(
          '✅ All Tokens Removed',
          `**Removed:** ${removed}\n**Saved to:** used.json`
        )]
      });

      bot.tokenService.saveTokens();
      return;
    }

    const indexes = [...new Set(
      args.map(i => parseInt(i)).filter(i => !isNaN(i) && i >= 0)
    )];

    if (!indexes.length) {
      return message.reply({
        embeds: [EmbedHandler.createErrorEmbed(
          'Invalid Input',
          'Provide valid index numbers (0, 1, 2...)'
        )]
      });
    }

    const loading = await message.reply({
      embeds: [EmbedHandler.createLoadingEmbed(`🗑️ Removing ${indexes.length} token(s)...`)]
    });

    let success = [];
    let failed = [];

    const sorted = indexes.sort((a, b) => b - a);

    const tokensToSave = [];

    for (const index of sorted) {
      const tokenData = bot.tokenService.getToken(index);
      if (tokenData) tokensToSave.push(tokenData.token);
    }

    usedTokens.push(...tokensToSave);
    fs.writeFileSync(usedPath, JSON.stringify(usedTokens, null, 2));

    for (const index of sorted) {
      const res = await bot.tokenService.removeToken(index);

      if (res.success) {
        success.push(`#${index} → ${res.username}`);
        Logger.info(`Removed #${index}: ${res.username}`);
      } else {
        failed.push(`#${index}`);
      }
    }

    let description = '';

    if (success.length) {
      description += `**Removed (${success.length}):**\n${success.join('\n')}\n\n`;
    }

    if (failed.length) {
      description += `**Failed (${failed.length}):**\n${failed.join(', ')}`;
    }

    await loading.edit({
      embeds: [
        success.length
          ? EmbedHandler.createSuccessEmbed('✅ Removal Complete', description)
          : EmbedHandler.createErrorEmbed('❌ Removal Failed', description || 'No tokens removed')
      ]
    });

    if (success.length) {
      bot.tokenService.saveTokens();
    }
  }
};
