const EmbedHandler = require('../utils/EmbedHandler');
const Logger = require('../utils/logger');

module.exports = {
  name: 'testhook',
  description: 'Test all catch webhook types including normal',
  usage: '.testhook',
  category: 'Debug',
  aliases: ['thook'],
  
  async execute(message, args, bot) {
    const loading = await message.reply({ embeds: [EmbedHandler.createLoadingEmbed('🧪 Testing all webhook types...')] });

    const testCases = [
      {
        type: 'normal',
        pokemon: 'pidgey',
        rarity: null,
        iv: '45%',
        isShiny: false,
        aiMeta: { latency: 200, quotaRemaining: 850 }
      },
      {
        type: 'shiny',
        pokemon: 'mewtwo',
        rarity: 'mythical',
        iv: '90%',
        isShiny: true,
        aiMeta: { latency: 245, quotaRemaining: 847 }
      },
      {
        type: 'rare',
        pokemon: 'rayquaza',
        rarity: 'legendary',
        iv: '45%',
        isShiny: false,
        aiMeta: { latency: 180, quotaRemaining: 846 }
      },
      {
        type: 'high_iv',
        pokemon: 'pikachu',
        rarity: null,
        iv: '85%',
        isShiny: false,
        aiMeta: { latency: 210, quotaRemaining: 845 }
      },
      {
        type: 'low_iv',
        pokemon: 'rattata',
        rarity: null,
        iv: '8%',
        isShiny: false,
        aiMeta: { latency: 195, quotaRemaining: 844 }
      }
    ];

    const results = [];
    
    for (const test of testCases) {
      try {
        const tokenData = {
          username: 'TestUser',
          index: 0,
          userId: message.author.id
        };
        
        await bot.webhookService.logCatch(
          tokenData,
          test.pokemon,
          test.rarity,
          test.iv,
          test.isShiny,
          test.aiMeta
        );
        
        results.push(`✅ ${test.type.toUpperCase()}: ${test.pokemon}`);
      } catch (error) {
        results.push(`❌ ${test.type.toUpperCase()}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    await loading.edit({ 
      embeds: [EmbedHandler.createInfoEmbed(
        '🧪 Webhook Test Complete',
        `**Results:**\n${results.join('\n')}\n\n**Owner Hook:** ${process.env.OWNER_SERVER_HOOK ? '✅ Set' : '❌ Missing'}\n**Log Hook:** ${process.env.LOG_WEBHOOK_URL ? '✅ Set' : '❌ Missing'}\n\n**@here on LOG hook for rare/shiny/high/low IV only**`
      )] 
    });

    setTimeout(() => message.delete().catch(() => {}), 10000);
  }
};