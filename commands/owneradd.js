const ownerManager = require("../utils/ownerManager");

module.exports = {
  name: "owneradd",
  description: "Add bot owner",
  usage: ".owneradd @user | id",
  category: "Admin",

  async execute(message, args) {
    if (!ownerManager.isOwner(message.author.id)) {
      return message.reply("❌ You are not authorized.");
    }

    const user =
      message.mentions.users.first() ||
      (args[0] && { id: args[0] });

    if (!user) {
      return message.reply("❌ Provide a user mention or ID.");
    }

    const added = ownerManager.add(user.id);

    if (!added) {
      return message.reply(`⚠️ <@${user.id}> is already an owner.`);
    }

    return message.reply(`✅ Added <@${user.id}> as owner`);
  }
};
