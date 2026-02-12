const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'auto-click',
  description: 'Toggle auto-click for confirmations',
  usage: '.auto-click [on|off|status] [index]',
  category: 'Automation',
  aliases: ['autoclick', 'ac'],
  
  async execute(message, args, bot) {
    if (!bot.autocatcherService.autoClickState) {
      bot.autocatcherService.autoClickState = new Map();
    }

    if (!args.length || args[0]?.toLowerCase() === 'status') {
      return this.showStatus(message, bot);
    }

    const action = args[0].toLowerCase();
    const index = args[1] ? parseInt(args[1]) : null;
    const enabled = action === 'on';

    if (!['on', 'off'].includes(action)) {
      return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
        'Invalid Action', 
        `\`${bot.config.prefix}auto-click on|off|status [index]\``
      )] });
    }

    if (index !== null) {
      const token = bot.tokenService.getToken(index);
      if (!token) {
        return message.reply({ embeds: [EmbedHandler.createErrorEmbed(
          'Invalid Index', `No account at #${index}`
        )] });
      }

      const current = bot.autocatcherService.autoClickState.get(index) ?? false;
      if (current === enabled) {
        return message.reply({ embeds: [EmbedHandler.createInfoEmbed(
          'Already Set', `Auto-click is already **${enabled ? 'ON' : 'OFF'}** for #${index}`
        )] });
      }

      bot.autocatcherService.autoClickState.set(index, enabled);
      await message.reply({ embeds: [EmbedHandler.createSuccessEmbed(
        `Auto-Click ${enabled ? 'ON' : 'OFF'}`,
        `#${index} ${token.username}: **${enabled ? '✅ Enabled' : '❌ Disabled'}**`
      )] });
    } else {
      const tokens = bot.tokenService.getAllTokens();
      let changed = 0;
      
      tokens.forEach((_, i) => {
        if ((bot.autocatcherService.autoClickState.get(i) ?? false) !== enabled) {
          bot.autocatcherService.autoClickState.set(i, enabled);
          changed++;
        }
      });

      await message.reply({ embeds: [EmbedHandler.createSuccessEmbed(
        `Auto-Click ${enabled ? 'ON' : 'OFF'}`,
        `**${tokens.length} accounts** | **${changed} changed**`
      )] });
    }
  },

  showStatus(message, bot) {
    const tokens = bot.tokenService.getAllTokens();
    if (!tokens.length) {
      return message.reply({ embeds: [EmbedHandler.createWarningEmbed(
        'No Tokens', 'Add accounts first'
      )] });
    }

    const status = tokens.map((token, i) => {
      const enabled = bot.autocatcherService.autoClickState.get(i) ?? false;
      return `${enabled ? '✅' : '❌'} #${i} ${token.username}`;
    });

    const enabledCount = status.filter(s => s.startsWith('✅')).length;
    
    message.reply({ embeds: [EmbedHandler.createInfoEmbed(
      '🔘 Auto-Click Status',
      `**Enabled:** ${enabledCount}/${tokens.length}\n\n${status.join('\n')}`
    )] });
  }
};