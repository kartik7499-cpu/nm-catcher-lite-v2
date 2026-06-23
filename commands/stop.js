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

    // STOP ALL
    if (args.length === 0 || args[0]?.toLowerCase() === 'all') {
      await bot.autocatcherService.stopAll();
      return message.reply({ embeds: [EmbedHandler.createSuccessEmbed(
        '🛑 All Stopped', `${active.length} catcher${active.length !== 1 ? 's' : ''} stopped`
      )] });
    }

    // MULTIPLE INDEX HANDLING
    const indexes = args
      .map(arg => parseInt(arg))
      .filter(num => !isNaN(num));

    if (!indexes.length) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'Invalid Input', 'Please provide valid index numbers or "all"'
      )] });
    }

    const results = [];

    for (const index of indexes) {
      const result = await bot.autocatcherService.stopCatching(index);

      if (result.success) {
        results.push(`✅ #${index}: ${result.username}`);
      } else {
        results.push(`❌ #${index}: ${result.error || 'Not active'}`);
      }
    }

    return message.reply({
      embeds: [
        EmbedHandler.createSuccessEmbed(
          '🛑 Stop Results',
          results.join('\n')
        )
      ]
    });
  }
};
