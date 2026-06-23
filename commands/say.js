const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'say',
  description: 'Send a message via selected catcher',

  async execute(message, args, bot) {
    try {
      const tokens = bot.tokenService.tokens;

      if (!tokens || !tokens.length) {
        return message.reply({
          embeds: [
            EmbedHandler.createErrorEmbed(
              'No Catchers',
              'No tokens available.'
            )
          ]
        });
      }

      const chunkSize = 20;
      const maxMenus = 5;

      const rows = [];

      for (let i = 0; i < tokens.length; i += chunkSize) {
        if (rows.length >= maxMenus) break;

        const chunk = tokens.slice(i, i + chunkSize);

        const options = chunk.map((t, idx) => ({
          label: t?.username
            ? String(t.username).slice(0, 100)
            : `Account ${i + idx}`,
          value: String(i + idx), // IMPORTANT: global index
          description: `Send message using ${t?.username || 'Unknown'}`.slice(0, 100)
        }));

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`say_select_${i}`) // unique ID per menu
          .setPlaceholder(`Select catcher (${i} - ${i + chunk.length - 1})`)
          .addOptions(options);

        rows.push(new ActionRowBuilder().addComponents(menu));
      }

      await message.reply({
        content: `📤 **Select a catcher (${tokens.length} available):**`,
        components: rows
      });

    } catch (error) {
      console.error('❌ SAY ERROR:', error);

      await message.reply({
        embeds: [
          EmbedHandler.createErrorEmbed(
            'Say Command Failed',
            `\`${error.message}\``
          )
        ]
      });
    }
  }
};
