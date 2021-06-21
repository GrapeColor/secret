import { Client, Snowflake } from 'discord.js';

export namespace Utils {
  export async function deleteMessage(
    bot: Client, channelID: Snowflake, messageID: Snowflake
  ): Promise<void> {
    const channel = bot.channels.cache.get(channelID);
    if (channel?.isText()) await channel.messages.delete(messageID);
  }
}
