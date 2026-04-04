const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'add',
  description: 'Add Discord token(s)',
  usage: '.add <token>',
  category: 'Token',
  aliases: ['token', 't'],

  async execute(message, args, bot) {
    const fullContent = message.content.slice(bot.config.prefix.length).trim();
    const token = fullContent.slice('add'.length).trim();

    if (token) {
      const loading = await message.reply({
        embeds: [EmbedHandler.createLoadingEmbed('🔍 Verifying token...')]
      });

      const result = await bot.tokenService.addToken(token);

      if (result.success) {
        await loading.edit({
          embeds: [EmbedHandler.createSuccessEmbed(
            '✅ Token Added',
            `**User:** ${result.username}\n**Index:** #${result.index}\n**ID:** ${result.userId}`
          )]
        });
        Logger.success(`Token #${result.index} added: ${result.username}`);
      } else {
        await loading.edit({
          embeds: [EmbedHandler.createErrorEmbed('❌ Failed', result.error)]
        });
      }

      setTimeout(() => message.delete().catch(() => {}), 3000);
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('add_single')
        .setLabel('Single')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('add_bulk')
        .setLabel('Bulk')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({
      content: '➕ **Add Tokens**',
      components: [row]
    });
  }
};
