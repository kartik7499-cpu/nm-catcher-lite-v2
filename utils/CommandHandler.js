const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class CommandHandler {
  constructor(bot) {
    if (!bot || !bot.client) {
      throw new Error('CommandHandler requires a valid bot with client');
    }

    this.bot = bot;
    this.commands = new Map();

    if (!this.bot.client.commands) {
      this.bot.client.commands = new Map();
    }
  }

  async loadCommands(commandsPath) {
    try {
      const absoluteCommandsPath = path.resolve(commandsPath);

      if (!fs.existsSync(absoluteCommandsPath)) {
        throw new Error(`Commands directory not found: ${absoluteCommandsPath}`);
      }

      const commandFiles = fs
        .readdirSync(absoluteCommandsPath)
        .filter(file => file.endsWith('.js'));

      let loadedCount = 0;

      Logger.info(
        `🔍 Loading commands from ${commandsPath} (${commandFiles.length} files)`
      );

      for (const file of commandFiles) {
        const filePath = path.join(absoluteCommandsPath, file);

        try {
          delete require.cache[require.resolve(filePath)];

          const command = require(filePath);

          if (!command || typeof command !== 'object') {
            throw new Error('Command did not export an object');
          }

          if (typeof command.name !== 'string' || !command.name.length) {
            throw new Error('Missing or invalid command.name');
          }

          if (typeof command.execute !== 'function') {
            throw new Error('Missing command.execute()');
          }

          const name = command.name.toLowerCase();

          this.commands.set(name, command);
          this.bot.client.commands.set(name, command);

          if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              if (typeof alias === 'string' && alias.length) {
                const aliasName = alias.toLowerCase();
                this.commands.set(aliasName, command);
                this.bot.client.commands.set(aliasName, command);
              }
            }
          }

          loadedCount++;

          Logger.success(
            `✅ Loaded: ${command.name}` +
              (command.aliases?.length
                ? ` (${command.aliases.join(', ')})`
                : '')
          );

        } catch (err) {
          Logger.error(`❌ Failed to load ${file}`);
          Logger.error(err.stack || err.message);
        }
      }

      Logger.success(
        `🎉 CommandHandler: ${loadedCount}/${commandFiles.length} commands loaded`
      );

      return loadedCount;

    } catch (err) {
      Logger.error('💥 CommandHandler load failed');
      Logger.error(err.stack || err.message);
      return 0;
    }
  }

  get(commandName) {
    if (!commandName) return null;
    return this.commands.get(commandName.toLowerCase()) || null;
  }

  getAllCommands() {
    const seen = new Set();
    const list = [];

    for (const cmd of this.commands.values()) {
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);

      list.push({
        name: cmd.name,
        aliases: cmd.aliases || [],
        description: cmd.description || 'No description'
      });
    }

    return list;
  }

  async reloadCommands(commandsPath) {
    this.commands.clear();
    this.bot.client.commands.clear();
    Logger.info('🔄 Reloading all commands...');
    return this.loadCommands(commandsPath);
  }
}

module.exports = CommandHandler;