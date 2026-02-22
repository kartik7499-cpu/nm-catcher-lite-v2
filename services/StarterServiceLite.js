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

  async handleStarter(tokenData, channel) {
    if (this.starterLocks.has(tokenData.index)) {
      return { success: false, reason: 'ALREADY_IN_PROGRESS' };
    }

    if (!channel || typeof channel.send !== 'function') {
      Logger.error(`Starter failed for ${tokenData.username}: Invalid channel`);
      return { success: false, reason: 'INVALID_CHANNEL' };
    }

    this.starterLocks.add(tokenData.index);

    try {
      await channel.send(`<@${POKETWO_ID}> start`);
      Logger.info(`Starter started for ${tokenData.username}`);

      await new Promise(resolve => setTimeout(resolve, 4000));

      const starter = STARTER_POKEMON[Math.floor(Math.random() * STARTER_POKEMON.length)];
      await channel.send(`<@${POKETWO_ID}> pick ${starter}`);

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

  isStarterPrompt(message) {
    const text = (
      (message.content || '') + ' ' +
      (message.embeds?.[0]?.description || '') + ' ' +
      (message.embeds?.[0]?.title || '')
    ).toLowerCase();

    return text.includes('starter') ||
           text.includes('before using this command') ||
           text.includes('pick a starter');
  }

  isTOSMessage(message) {
    if (!message.embeds?.[0]) return false;
    const embed = message.embeds[0];
    const title = (embed.title || '').toLowerCase();
    const description = (embed.description || '').toLowerCase();

    return title.includes('terms of service') ||
           description.includes('terms of service');
  }

  isStarterConfirmation(content) {
    const text = (content || '').toLowerCase();
    return text.includes('congratulations') ||
           (text.includes('first pok') && text.includes('info'));
  }
}

module.exports = StarterService;
