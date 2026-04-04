const EmbedHandler = require('../utils/EmbedHandler');

module.exports = {
  name: 'help',
  description: 'Show all NM Catcher Lite commands',
  aliases: ['h', 'commands'],
  
  async execute(message, args, bot) {
    const prefix = bot.config.prefix;

    const embed = EmbedHandler.createInfoEmbed(
      '🚀 NM Catcher Lite v2.0 - Command Reference',

      `__**📥 TOKEN MANAGEMENT**__\n` +
      `**${prefix}add** → Open UI (Single / Bulk add tokens)\n` +
      `**${prefix}add <token>** → Add single token directly\n` +
      `**${prefix}list** → List all tokens\n` +
      `**${prefix}remove <index | multiple | all>** → Remove token(s)\n\n` +

      `__**🤖 AUTOCATCHER CONTROL**__\n` +
      `**${prefix}start or ${prefix}start [index]** → Start catching\n` +
      `**${prefix}stop or ${prefix}stop [index]** → Stop catching\n` +
      `**${prefix}catching** → View active catchers\n\n` +

      `__**📊 UTILITIES**__\n` +
      `**${prefix}stats or ${prefix}stats [index]** → View statistics\n` +
      `**${prefix}api** → Check AI API balance\n\n` +

      `__**💬 INTERACTION SYSTEMS**__\n` +
      `**${prefix}say** → Select catcher + send message (UI based)\n` +
      `**${prefix}auto-click [on|off|status]** → Toggle auto-click\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**💰 Accounts:** ${bot.tokenService.getAllTokens().length}\n` +
      `**🤖 AI:** ${bot.aiService.isAvailable() ? '✅ Available' : '❌ Not Configured'}\n` +
      `**🔐 Captcha:** ${bot.captchaService.isAvailable() ? '✅ Available' : '❌ Not Configured'}`
    );

    embed.setFooter({
      text: `NM CATCHER LITE V2 | TEAM NECROZMA`,
      iconURL: 'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
    });

    embed.setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
