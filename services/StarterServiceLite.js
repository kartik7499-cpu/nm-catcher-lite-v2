const Logger = require('../utils/logger');

const POKETWO_ID = '716390085896962058';
const STARTER_POKEMON = [
  'charmander', 'bulbasaur', 'squirtle',
  'chikorita', 'cyndaquil', 'totodile',
  'treecko', 'torchic', 'mudkip',
  'turtwig', 'chimchar', 'piplup',
  'snivy', 'tepig', 'oshawott',
  'chespin', 'fennekin', 'froakie',
  'rowlet', 'litten', 'popplio',
  'grookey', 'scorbunny', 'sobble',
  'sprigatito', 'fuecoco', 'quaxly'
];

class StarterService {
  constructor(bot) {
    this.bot = bot;
    this.starterLocks = new Set();
  }

  async handleStarter(tokenData, channelId) {
    if (this.starterLocks.has(tokenData.index)) {
      return { success: false, reason: 'ALREADY_IN_PROGRESS' };
    }

    this.starterLocks.add(tokenData.index);
    
    try {
      await channelId.send(`<@${POKETWO_ID}> start`);
      Logger.info(`Starter started for ${tokenData.username}`);
      
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const starter = STARTER_POKEMON[Math.floor(Math.random() * STARTER_POKEMON.length)];
      Logger.success(`✅ Starter COMPLETE: ${starter} for ${tokenData.username}`);
      
      return { 
        success: true, 
        starter: starter 
      };
      
    } catch (error) {
      Logger.error(`Starter failed for ${tokenData.username}:`, error.message);
      return { success: false, reason: error.message };
    } finally {
      this.starterLocks.delete(tokenData.index);
    }
  }

  isStarterPrompt(content) {
    return content.includes('pick a starter') || content.includes('before using');
  }

  isTOSMessage(message) {
    if (!message.embeds?.[0]) return false;
    const embed = message.embeds[0];
    return embed.title?.includes('Terms of Service') || 
           embed.description?.includes('accept our Terms');
  }

  isStarterConfirmation(content) {
    return content.includes('Congratulations') || 
           (content.includes('first pokémon') && content.includes('info'));
  }
}

module.exports = StarterService;