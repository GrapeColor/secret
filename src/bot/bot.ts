import { Client } from 'discord.js';
import { SecretShare } from './interactions/share';

const bot = new Client({
  intents: ['GUILDS', 'DIRECT_MESSAGES'],
  partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'],
  restTimeOffset: 100,
  retryLimit: 3,
  presence: { activities: [{ name: '/share' }] },
});

function initialize(): void {
  SecretShare.initialize(bot);
}

bot.on('ready', () => initialize());
bot.on('shardReady', shardID => console.info(`Shard No.${shardID} is ready.`));

bot.login()
  .catch(console.error);

process.on('exit', () => bot.destroy());
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT',  () => process.exit(0));
