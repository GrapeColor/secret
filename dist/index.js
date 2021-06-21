"use strict";
/**
 * The index may be compiled and executed!
 */
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const constants_1 = require("./constants");
const manager = new discord_js_1.ShardingManager('./dist/bot/bot.js', {
    token: process.env['QUICK_POLL_TOKEN'],
    totalShards: constants_1.BOT_TOTAL_SHARDS,
    shardList: constants_1.BOT_SHARD_LIST,
});
manager.on('shardCreate', shard => {
    console.info(`Spawned shard ${shard.id + 1}/${manager.totalShards}.`);
});
console.info('Start spawning shards.');
manager.spawn({ timeout: -1 })
    .then(() => console.info('All shards were successfully spawned.'))
    .catch(console.error);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUVILDJDQUE2QztBQUM3QywyQ0FBK0Q7QUFFL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBZSxDQUFDLG1CQUFtQixFQUFFO0lBQ3ZELEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0lBQ3RDLFdBQVcsRUFBRSw0QkFBZ0I7SUFDN0IsU0FBUyxFQUFFLDBCQUFjO0NBQzFCLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUFFO0lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztLQUMzQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0tBQ2pFLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMifQ==