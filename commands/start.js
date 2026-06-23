const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'start',
  description: 'Start autocatching',
  usage: '.start [index|all]',
  category: 'Catcher',
  aliases: ['catch', 'go'],
  
  async execute(message, args, bot) {
    const tokens = bot.tokenService.getAllTokens();

    if (!tokens.length) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'No Tokens', 'Add tokens first: `$add <token>`'
      )] });
    }

    // START ALL
    if (args.length === 0 || args[0]?.toLowerCase() === 'all') {
      const loading = await message.reply({ embeds: [EmbedHandler.createLoadingEmbed(
        `🚀 Starting ${tokens.length} catcher${tokens.length !== 1 ? 's' : ''}...`
      )] });

      const results = [];

      for (let i = 0; i < tokens.length; i++) {
        const result = await bot.autocatcherService.startCatching(i);
        results.push({
          index: i,
          success: result.success,
          username: tokens[i]?.username
        });
      }

      const success = results.filter(r => r.success);

      return loading.edit({ embeds: [EmbedHandler.createSuccessEmbed(
        `✅ ${success.length}/${tokens.length} Started`,
        success.map(r => `#${r.index}: ${r.username}`).join('\n') || 'None succeeded'
      )] });
    }

    // MULTIPLE INDEX SUPPORT
    const indexes = args
      .map(arg => parseInt(arg))
      .filter(num => !isNaN(num));

    if (!indexes.length) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'Invalid Input', 'Provide valid index numbers or "all"'
      )] });
    }

    const loading = await message.reply({ embeds: [EmbedHandler.createLoadingEmbed(
      `🚀 Starting ${indexes.length} catcher${indexes.length !== 1 ? 's' : ''}...`
    )] });

    const results = [];

    for (const index of indexes) {
      if (index < 0 || !tokens[index]) {
        results.push(`❌ #${index}: Invalid index`);
        continue;
      }

      try {
        const result = await bot.autocatcherService.startCatching(index);

        if (result.success) {
          results.push(`✅ #${index}: ${tokens[index].username}`);
        } else {
          results.push(`❌ #${index}: ${result.error}`);
        }
      } catch (err) {
        Logger.error(`Start error for index ${index}:`, err);
        results.push(`❌ #${index}: Unexpected error`);
      }
    }

    return loading.edit({
      embeds: [
        EmbedHandler.createSuccessEmbed(
          '🚀 Start Results',
          results.join('\n')
        )
      ]
    });
  }
};
