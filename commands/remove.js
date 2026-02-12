const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'remove',
  description: 'Remove token by index',
  usage: '.remove <index>',
  category: 'Token',
  aliases: ['rm', 'delete', 'del'],
  
  async execute(message, args, bot) {
    if (!args[0]) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'Missing Index', 
        `**Usage:** \`${bot.config.prefix}remove <index>\`\nRun \`$list\` to see indexes`
      )] });
    }

    const index = parseInt(args[0]);
    if (isNaN(index) || index < 0) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'Invalid Index', 'Must be a valid number (0, 1, 2...)'
      )] });
    }

    const loading = await message.reply({ embeds: [EmbedHandler.createLoadingEmbed('🗑️ Removing...')] });
    const result = await bot.tokenService.removeToken(index);
    
    if (result.success) {
      await loading.edit({ embeds: [EmbedHandler.createSuccessEmbed(
        '✅ Token Removed',
        `**#${index}:** ${result.username}\n**ID:** ${result.userId}`
      )] });
      Logger.info(`Token #${index} removed by ${message.author.tag}`);
    } else {
      await loading.edit({ embeds: [EmbedHandler.createErrorEmbed('❌ Failed', result.error)] });
    }
  }
};