const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'catching',
  description: 'View active catchers',
  usage: '.catching',
  category: 'Status',
  aliases: ['active', 'status'],
  
  async execute(message, args, bot) {
    const active = bot.autocatcherService.getActiveCatchers();
    
    if (!active.length) {
      return message.reply({ embeds: [EmbedHandler.createWarningEmbed(
        'Idle', 'No catchers active. Use `$start`'
      )] });
    }

    const lines = active.map(c => 
      `🟢 #${c.index} ${c.username}\n` +
      `  Spawns: ${c.stats?.spawnsDetected || 0} | Success: ${c.stats?.catchSuccess || 0}`
    );

    await message.reply({ embeds: [EmbedHandler.createInfoEmbed(
      `🎯 ${active.length} Active Catcher${active.length !== 1 ? 's' : ''}`,
      lines.join('\n\n')
    )] });
  }
};