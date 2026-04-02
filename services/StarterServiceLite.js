const Logger = require('../utils/logger');

const POKETWO_ID = '716390085896962058';
const STARTER_POKEMON = [
  'charmander','bulbasaur','squirtle',
  'chikorita','cyndaquil','totodile',
  'treecko','torchic','mudkip',
  'turtwig','chimchar','piplup',
  'snivy','tepig','oshawott',
  'chespin','fennekin','froakie',
  'rowlet','litten','popplio',
  'grookey','scorbunny','sobble',
  'sprigatito','fuecoco','quaxly'
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
      const client = tokenData.client;
      const channel = await client.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        throw new Error('Invalid channel');
      }

      const starter = STARTER_POKEMON[Math.floor(Math.random() * STARTER_POKEMON.length)];

      await channel.send(`<@${POKETWO_ID}> pick ${starter}`);
      Logger.info(`Picking starter ${starter} for ${tokenData.username}`);

      const filter = (msg) =>
        msg.author.id === POKETWO_ID &&
        msg.embeds?.length &&
        msg.embeds[0].title?.toLowerCase().includes('terms');

      const collected = await channel.awaitMessages({
        filter,
        max: 1,
        time: 15000
      }).catch(() => null);

      if (collected && collected.first()) {
        const msg = collected.first();
        const buttons = msg.components?.[0]?.components;

        if (buttons) {
          const acceptBtn = buttons.find(b =>
            b.label?.toLowerCase().includes('accept')
          );

          if (acceptBtn) {
            await msg.clickButton(acceptBtn.customId);
            Logger.success(`Accepted TOS for ${tokenData.username}`);
          }
        }
      }

      return { success: true, starter };

    } catch (error) {
      Logger.error(`Starter failed for ${tokenData.username}: ${error.message}`);
      return { success: false, reason: error.message };
    } finally {
      setTimeout(() => this.starterLocks.delete(tokenData.index), 15000);
    }
  }

  isStarterPrompt(content) {
    const text = content.toLowerCase();
    return text.includes('pick a starter') || text.includes('before using');
  }

  isTOSMessage(message) {
    if (!message.embeds?.[0]) return false;
    const embed = message.embeds[0];
    return embed.title?.toLowerCase().includes('terms');
  }

  isStarterConfirmation(content) {
    const text = content.toLowerCase();
    return text.includes('congratulations') ||
           (text.includes('first pokémon') && text.includes('info'));
  }
}

module.exports = StarterService;
