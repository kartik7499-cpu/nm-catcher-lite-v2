const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'stop',
  description: 'Stop autocatching',
  usage: '.stop [index|all]',
  category: 'Catcher',
  aliases: ['halt', 'end'],
  
  async execute(message, args, bot) {
    const active = bot.autocatcherService.getActiveCatchers();
    
    if (!active.length) {
      return message.reply({ embeds: [EmbedHandler.createWarningEmbed(
        'No Catchers', 'No accounts are catching right now'
      )] });
    }

    if (args.length === 0 || args[0]?.toLowerCase() === 'all') {
      await bot.autocatcherService.stopAll();
      await message.reply({ embeds: [EmbedHandler.createSuccessEmbed(
        '🛑 All Stopped', `${active.length} catcher${active.length !== 1 ? 's' : ''} stopped`
      )] });
    } else {
      const index = parseInt(args[0]);
      const result = await bot.autocatcherService.stopCatching(index);
      
      await message.reply({ embeds: result.success
        ? [EmbedHandler.createSuccessEmbed('🛑 Stopped', `#${index}: ${result.username}`)]
        : [EmbedHandler.createErrorEmbed('Failed', result.error || 'Not active')]
      });
    }
  }
};