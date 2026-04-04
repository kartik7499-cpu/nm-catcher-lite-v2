const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'say',
  description: 'Send a message via selected catcher',
  usage: '.say',

  async execute(message, args, bot) {
    try {
      const tokens = bot.tokenService.tokens;

      if (!tokens.length) {
        return message.reply({
          embeds: [
            EmbedHandler.createErrorEmbed(
              'No Catchers',
              'No tokens available.'
            )
          ]
        });
      }

      const options = tokens.map((t, i) => ({
        label: t.username || `Account ${i}`,
        value: String(i),
        description: `Send message using ${t.username}`
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('say_select_catcher')
        .setPlaceholder('Select catcher...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await message.reply({
        content: '📤 **Select a catcher to send message:**',
        components: [row]
      });

    } catch (error) {
      console.error(error);
      await message.reply({
        embeds: [
          EmbedHandler.createErrorEmbed(
            'Error',
            'Failed to execute say command.'
          )
        ]
      });
    }
  }
};
