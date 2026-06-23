const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'list',
  description: 'List all added tokens',
  usage: '.list',
  category: 'Token',
  aliases: ['tokens', 'ls'],
  
  async execute(message, args, bot) {
    const tokens = bot.tokenService.getAllTokens();
    
    if (!tokens.length) {
      return message.reply({ embeds: [EmbedHandler.createWarningEmbed(
        'No Tokens', 'Add tokens with `$add <token>`'
      )] });
    }

    const active = bot.autocatcherService.getActiveCatchers();
    const description = tokens.map((t, i) => 
      `**#${i}** ${t.username} ${active.some(c => c.index === i) ? '🟢' : '⚪'}`
    ).join('\n');

    const embed = EmbedHandler.createInfoEmbed(
      `🎫 ${tokens.length} Token${tokens.length !== 1 ? 's' : ''}`,
      `**Active:** ${active.length}/${tokens.length}\n\n${description}`
    );
    
    await message.reply({ embeds: [embed] });
  }
};