const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');
const POKETWO_ID = '716390085896962058';

module.exports = {
  name: 'say',
  description: 'Make accounts in current channel send a message',
  usage: '.say <message>',
  category: 'Control',
  aliases: ['speak', 'send'],
  
  async execute(message, args, bot) {
    if (args.length === 0) {
      const errorEmbed = EmbedHandler.createErrorEmbed(
        'Missing Message',
        'Please provide a message to send.\n\n**Usage:** `$say <message>`\n\n**Examples:**\n`$say hi`\n`$say p2 info`'
      );
      return message.reply({ embeds: [errorEmbed] });
    }

    const fullContent = message.content.slice(bot.config.prefix.length).trim();
    const withoutCommand = fullContent.substring(fullContent.indexOf(' ') + 1);
    const messageToSend = withoutCommand.replace(/\bp2\b/gi, `<@${POKETWO_ID}>`);
    
    const channel = message.channel;
    const tokens = bot.tokenService.getAllTokens();

    if (tokens.length === 0) {
      const errorEmbed = EmbedHandler.createErrorEmbed(
        'No Accounts',
        'No accounts have been added yet.'
      );
      return message.reply({ embeds: [errorEmbed] });
    }

    const loadingEmbed = EmbedHandler.createLoadingEmbed(
      `Sending "${messageToSend}" from ${tokens.length} accounts...`
    );
    const loading = await message.reply({ embeds: [loadingEmbed] });

    const sendPromises = tokens.map(async (_, index) => {
      const tokenData = bot.tokenService.getToken(index);
      
      if (!tokenData || !tokenData.client) {
        return { success: false, index, reason: 'no_client', username: tokenData?.username };
      }

      try {
        await new Promise(resolve => setTimeout(resolve, index * 150));
        
        const targetChannel = await tokenData.client.channels.fetch(channel.id).catch(() => null);
        if (!targetChannel) {
          return { success: false, index, reason: 'not_in_channel', username: tokenData.username };
        }

        await targetChannel.send(messageToSend);
        Logger.success(`✅ ${tokenData.username} sent: "${messageToSend}"`);
        
        return {
          success: true,
          index,
          username: tokenData.username
        };
      } catch (error) {
        Logger.error(`❌ ${tokenData.username} failed:`, error.message);
        return {
          success: false,
          index,
          reason: error.message,
          username: tokenData.username
        };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    
    let sentCount = 0;
    let failedCount = 0;
    const successAccounts = [];
    const failedAccounts = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++;
        successAccounts.push(`✅ #${result.value.index} ${result.value.username}`);
      } else {
        failedCount++;
        const value = result.value || {};
        failedAccounts.push(`❌ #${value.index}: ${value.username || 'Unknown'}`);
      }
    });

    const resultsText = successAccounts.length > 0
      ? successAccounts.slice(0, 10).join('\n') + (successAccounts.length > 10 ? `\n... +${successAccounts.length - 10}` : '')
      : 'None';

    const description = `**Total:** ${tokens.length}\n**Sent:** ${sentCount} ✅\n**Failed:** ${failedCount} ❌\n\n**Results:**\n${resultsText}`;
    
    const embed = sentCount > 0
      ? EmbedHandler.createSuccessEmbed('✅ Say Command', description)
      : EmbedHandler.createErrorEmbed('❌ Say Failed', description);

    await loading.edit({ embeds: [embed] });

    setTimeout(() => {
      message.delete().catch(() => {});
      loading.delete().catch(() => {});
    }, 5000);
  }
};