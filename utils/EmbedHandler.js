const { EmbedBuilder } = require('discord.js');

class EmbedHandler {
  static base(color) {
    return new EmbedBuilder()
      .setColor(color)
      .setTimestamp();
  }

  static normalize(description) {
    if (Array.isArray(description)) {
      const cleaned = description
        .filter(v => typeof v === 'string' && v.trim().length > 0);
      return cleaned.length ? cleaned.join('\n') : null;
    }
    if (typeof description === 'string' && description.trim().length > 0) {
      return description;
    }
    return null;
  }

  static createInfoEmbed(title, description) {
    const embed = this.base(0x3498db).setTitle(title);
    const text = this.normalize(description);
    if (text) embed.setDescription(text);
    return embed;
  }

  static createSuccessEmbed(title, description) {
    const embed = this.base(0x2ecc71).setTitle(title);
    const text = this.normalize(description);
    if (text) embed.setDescription(text);
    return embed;
  }

  static createErrorEmbed(title, description) {
    const embed = this.base(0xe74c3c).setTitle(title);
    const text = this.normalize(description);
    if (text) embed.setDescription(text);
    return embed;
  }

  static createWarningEmbed(title, description) {
    const embed = this.base(0xf1c40f).setTitle(title);
    const text = this.normalize(description);
    if (text) embed.setDescription(text);
    return embed;
  }

  static createLoadingEmbed(text = 'Processing...') {
    return this.base(0x95a5a6)
      .setDescription(`⏳ ${text}`);
  }
}

module.exports = EmbedHandler;