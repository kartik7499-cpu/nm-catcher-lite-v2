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

    const loading = await message.reply({ embeds: [EmbedHandler.createLoadingEmbed(
      `🚀 Starting ${tokens.length} catcher${tokens.length !== 1 ? 's' : ''}...`
    )] });

    if (args.length === 0 || args[0]?.toLowerCase() === 'all') {
      const results = [];
      for (let i = 0; i < tokens.length; i++) {
        const result = await bot.autocatcherService.startCatching(i);
        results.push({ index: i, success: result.success, username: tokens[i]?.username });
      }
      
      const success = results.filter(r => r.success);
      await loading.edit({ embeds: [EmbedHandler.createSuccessEmbed(
        `✅ ${success.length}/${tokens.length} Started`,
        success.map(r => `#${r.index}: ${r.username}`).join('\n') || 'None succeeded'
      )] });
      
    } else {
      const index = parseInt(args[0]);
      if (isNaN(index) || index < 0 || !tokens[index]) {
        return loading.edit({ embeds: [EmbedHandler.createErrorEmbed(
          'Invalid Index', `Use #0-${tokens.length - 1}. Run \`$list\``
        )] });
      }
      
      const result = await bot.autocatcherService.startCatching(index);
      await loading.edit({ embeds: result.success 
        ? [EmbedHandler.createSuccessEmbed('✅ Started', `#${index}: ${tokens[index].username}`)]
        : [EmbedHandler.createErrorEmbed('❌ Failed', result.error)]
      });
    }
  }
};