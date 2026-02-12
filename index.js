require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const Logger = require('./utils/logger');
const TokenServiceLite = require('./services/TokenServiceLite');
const WebhookServiceLite = require('./services/WebhookServiceLite');
const AIPredictionServiceLite = require('./services/AIPredictionServiceLite');
const CaptchaSolverLite = require('./services/CaptchaSolverLite');
const StarterServiceLite = require('./services/StarterServiceLite');
const AutocatcherServiceLite = require('./services/AutocatcherServiceLite');
const CommandHandler = require('./utils/CommandHandler');
const EmbedHandler = require('./utils/EmbedHandler');

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
    ownerIds: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],
    catchWebhook: process.env.CATCH_WEBHOOK_URL
  }
};

const logger = new Logger(bot);

process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down NM Catcher Lite...');
  
  if (bot.autocatcherService) {
    await bot.autocatcherService.stopAll();
  }
  
  if (bot.tokenService) {
    await bot.tokenService.saveTokens();
  }
  
  logger.success('✅ All services stopped gracefully');
  process.exit(0);
});

async function initServices() {
  logger.info('🔧 Initializing NM Catcher Lite services...');
  
  bot.tokenService = new TokenServiceLite(bot);
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

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.author.id === client.user.id) return;
  if (!bot.config.ownerIds.includes(message.author.id)) return;
  if (!message.content.startsWith(bot.config.prefix)) return;
  
  const args = message.content.slice(bot.config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  const command = client.commands.get(commandName) || 
                  client.commands.find(cmd => cmd.aliases?.includes(commandName));
  
  if (!command) return;
  
  try {
    await command.execute(message, args, bot);
    logger.debug(`Command executed: ${commandName} by ${message.author.tag}`);
  } catch (error) {
    logger.error(`❌ Command "${commandName}" failed:`, error);
    
    const embed = EmbedHandler.createErrorEmbed(
      'Command Error',
      `**Error:** \`${error.message}\`\n**Try:** \`${bot.config.prefix}help\` for usage.`
    );
    
    await message.reply({ embeds: [embed] }).catch(() => {});
  }
});

client.on('error', (error) => {
  logger.error('❌ Discord Client error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { promise, reason });
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.success('🔑 Discord bot authenticated successfully'))
  .catch(err => {
    logger.error('💥 LOGIN FAILED:', err.message);
    logger.error('❌ Verify DISCORD_TOKEN in .env file');
    process.exit(1);

  });
