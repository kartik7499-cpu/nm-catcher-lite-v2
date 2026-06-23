const ownerManager = require("../utils/ownerManager");

module.exports = {
  name: "ownerremove",
  description: "Remove bot owner",
  usage: ".ownerremove @user | id",
  category: "Admin",

  async execute(message, args) {
    if (!ownerManager.isOwner(message.author.id)) {
      return message.reply("❌ Unauthorized.");
    }

    const user =
      message.mentions.users.first() ||
      (args[0] && { id: args[0] });

    if (!user) {
      return message.reply("❌ Provide a user mention or ID.");
    }

    const removed = ownerManager.remove(user.id);

    if (!removed) {
      return message.reply(`⚠️ <@${user.id}> cannot be removed or is not an owner.`);
    }

    return message.reply(`🗑 Removed <@${user.id}>`);
  }
};
