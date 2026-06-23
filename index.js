require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Logger = require('./utils/logger');
const TokenServiceLite = require('./services/TokenServiceLite');
const WebhookServiceLite = require('./services/WebhookServiceLite');
const AIPredictionServiceLite = require('./services/AIPredictionServiceLite');
const CaptchaSolverLite = require('./services/CaptchaSolverLite');
const StarterServiceLite = require('./services/StarterServiceLite');
const AutocatcherServiceLite = require('./services/AutocatcherServiceLite');
const HintService = require('./services/hintService');
const CommandHandler = require('./utils/CommandHandler');
const EmbedHandler = require('./utils/EmbedHandler');
const ownerManager = require("./utils/ownerManager");

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const bot = {
  client,
  tokenService: null,
  webhookService: null,
  aiService: null,
  captchaService: null,
  starterService: null,
  autocatcherService: null,
  config: {
    prefix: process.env.PREFIX || '$',
    logWebhook: process.env.LOG_WEBHOOK_URL
  }
};

const logger = new Logger(bot);

function isOwner(userId) {
  return ownerManager.isOwner(userId);
}

process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down NM Catcher Lite...');
  if (bot.autocatcherService) await bot.autocatcherService.stopAll();
  if (bot.tokenService) await bot.tokenService.saveTokens();
  logger.success('✅ All services stopped gracefully');
  process.exit(0);
});

async function initServices() {
  logger.info('🔧 Initializing NM Catcher Lite services...');

  bot.tokenService = new TokenServiceLite(bot);
  bot.hintService = new HintService();

  bot.tokenService.on('tokensReady', async (count) => {
    logger.info(`⚡ Tokens ready (${count}), starting catchers...`);
    const tokens = bot.tokenService.tokens;

    for (let i = 0; i < tokens.length; i++) {
      try {
        const res = await bot.autocatcherService.startCatching(i, 'ai');
        if (res.success) {
          logger.success(`✅ Auto-started: ${res.username} (#${i})`);
        } else {
          logger.warn(`⚠️ Failed to auto-start ${i}: ${res.error}`);
        }
      } catch (err) {
        logger.error(`❌ Auto-start error for ${i}: ${err.message}`);
      }
    }

    logger.success('🚀 Auto-start process completed');
  });

  bot.webhookService = new WebhookServiceLite(bot);
  bot.aiService = new AIPredictionServiceLite(bot);
  bot.captchaService = new CaptchaSolverLite(bot, bot.webhookService);
  bot.starterService = new StarterServiceLite(bot);

  bot.autocatcherService = new AutocatcherServiceLite(
    bot.tokenService,
    bot.aiService,
    bot.captchaService,
    bot.webhookService,
    bot.starterService,
    bot.hintService,
    bot
  );

  logger.success('✅ ALL 6 Lite Services initialized perfectly');
  logger.info(`🤖 AI Service: ${bot.aiService.isAvailable() ? '✅ READY' : '❌ CONFIGURE PREDICTION_API_KEY'}`);
  logger.info(`🔐 Captcha: ${bot.captchaService.isAvailable() ? '✅ READY' : '❌ CONFIGURE CAPTCHA_API_KEY'}`);
}

client.once('ready', async () => {
  logger.success(`\n🚀 NM Catcher Lite v2.0 - ${client.user.tag} ONLINE! 🚀`);
  logger.info(`📍 Serving ${client.guilds.cache.size} servers`);

  client.commands = new Collection();
  const commandHandler = new CommandHandler(bot);
  await commandHandler.loadCommands('./commands');

  await initServices();

  setInterval(() => {
    if (bot.autocatcherService) {
      const active = bot.autocatcherService.getActiveCatchers();
      client.user.setActivity(
        `${active.length} catcher${active.length !== 1 ? 's' : ''} active | ${bot.config.prefix}help`,
        { type: 'PLAYING' }
      );
    }
  }, 30000);

  logger.success('🎉 NM Catcher Lite fully operational!');
});

client.on('interactionCreate', async (interaction) => {
  try {

    if (interaction.isStringSelectMenu()) {
      if (!interaction.customId.startsWith('say_select_')) return;

      const index = parseInt(interaction.values[0]);
      const token = bot.tokenService.getToken(index);

      if (!token) {
        return interaction.reply({ content: '❌ Invalid catcher', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`say_modal_${index}`)
        .setTitle(`Send via ${token.username}`);

      const input = new TextInputBuilder()
        .setCustomId('say_input')
        .setLabel('Enter message')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'add_single') {
        const modal = new ModalBuilder()
          .setCustomId('add_single_modal')
          .setTitle('Add Token');

        const input = new TextInputBuilder()
          .setCustomId('single_token')
          .setLabel('Enter token')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'add_bulk') {
        const modal = new ModalBuilder()
          .setCustomId('add_bulk_modal')
          .setTitle('Add Bulk Tokens');

        const input = new TextInputBuilder()
          .setCustomId('bulk_tokens')
          .setLabel('Enter tokens (1 per line, max 20)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {

      if (interaction.customId === 'add_single_modal') {
        await interaction.deferReply({ ephemeral: true });

        const token = interaction.fields.getTextInputValue('single_token').trim();
        const res = await bot.tokenService.addToken(token);

        return interaction.editReply(res.success
          ? `✅ Added: ${res.username}`
          : `❌ Failed: ${res.error}`);
      }

      if (interaction.customId === 'add_bulk_modal') {
        await interaction.deferReply({ ephemeral: true });

        const raw = interaction.fields.getTextInputValue('bulk_tokens');
        const tokens = raw.split('\n').map(t => t.trim()).filter(Boolean);

        let success = 0, failed = 0;
        for (const token of tokens) {
          const res = await bot.tokenService.addToken(token);
          res.success ? success++ : failed++;
        }

        return interaction.editReply(`✅ Added: ${success}\n❌ Failed: ${failed}`);
      }

      if (interaction.customId.startsWith('say_modal_')) {
        await interaction.deferReply({ ephemeral: true });

        const index = parseInt(interaction.customId.split('_')[2]);
        let text = interaction.fields.getTextInputValue('say_input');
        text = text.replace(/\bp2\b/gi, `<@${bot.autocatcherService.poketwoId}>`);
        const token = bot.tokenService.getToken(index);

        if (!token) return interaction.editReply('❌ Invalid catcher');

        try {
          const channel = await token.client.channels.fetch(interaction.channelId);

          await channel.sendTyping();
          await new Promise(r => setTimeout(r, 1000));

          try {
            await channel.send(text);
          } catch (err) {
            logger.warn(`⚠️ Send failed: ${err.message}`);
          }

          return interaction.editReply(`✅ Sent via ${token.username}`);

        } catch (err) {
          return interaction.editReply(`❌ Failed: ${err.message}`);
        }
      }
    }

  } catch (err) {
    logger.error(`❌ Interaction crash prevented: ${err.message}`);
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || message.author.id === client.user.id) return;
    if (!message.content.startsWith(bot.config.prefix)) return;
    if (!isOwner(message.author.id)) return;

    const args = message.content.slice(bot.config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) ||
      client.commands.find(cmd => cmd.aliases?.includes(commandName));

    if (!command) return;

    await command.execute(message, args, bot);

  } catch (err) {
    logger.error(`❌ Message handler crash prevented: ${err.message}`);
  }
});

client.on('error', (error) => {
  logger.error('❌ Discord Client error:', error);
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.success('🔑 Discord bot authenticated successfully'))
  .catch(err => {
    logger.error('💥 LOGIN FAILED:', err.message);
    process.exit(1);
  });