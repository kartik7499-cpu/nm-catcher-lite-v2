const { EmbedBuilder } = require('discord.js');
const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'help',
  description: 'Show all NM Catcher Lite commands',
  aliases: ['h', 'commands'],
  
  async execute(message, args, bot) {
    const prefix = bot.config.prefix;
    
    const embed = EmbedHandler.createInfoEmbed(
      '🚀 NM Catcher Lite v2.0 - Command Reference',
      `**🤖 ${prefix}help** - Show this help\n` +
      `**🤖 ${prefix}api** *(new)* - Check AI Prediction API balance\n` +
      `**📥 ${prefix}add <token>** - Add Discord account\n` +
      `**📋 ${prefix}list** - List all tokens\n` +
      `**🗑️ ${prefix}remove <index>** - Remove token\n\n` +
      `**▶️ ${prefix}start [index]** - Start catching\n` +
      `**⏹️ ${prefix}stop [index]** - Stop catching\n` +
      `**🎯 ${prefix}catching** - Active catchers\n\n` +
      `**📊 ${prefix}stats [index]** - Statistics\n` +
      `**💬 ${prefix}say <message>** - Make accounts speak\n` +
      `**🔘 ${prefix}auto-click [on|off|status]** - Auto-click toggle\n\n` +
      `**💰 Accounts:** ${bot.tokenService.getAllTokens().length}\n` +
      `**🤖 AI:** ${bot.aiService.isAvailable() ? '✅' : '❌'}\n` +
      `**🔐 Captcha:** ${bot.captchaService.isAvailable() ? '✅' : '❌'}`
    );

    embed.setFooter({
      text: `NM CATCHER LITE V2 | YAKUZA & GANG`,
      iconURL: 'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
    });

    await message.reply({ embeds: [embed] });
  }
};