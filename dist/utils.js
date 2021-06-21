"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
var Utils;
(function (Utils) {
    async function deleteMessage(bot, channelID, messageID) {
        const channel = bot.channels.cache.get(channelID);
        if (channel?.isText())
            await channel.messages.delete(messageID);
    }
    Utils.deleteMessage = deleteMessage;
})(Utils = exports.Utils || (exports.Utils = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsSUFBaUIsS0FBSyxDQU9yQjtBQVBELFdBQWlCLEtBQUs7SUFDYixLQUFLLFVBQVUsYUFBYSxDQUNqQyxHQUFXLEVBQUUsU0FBb0IsRUFBRSxTQUFvQjtRQUV2RCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsSUFBSSxPQUFPLEVBQUUsTUFBTSxFQUFFO1lBQUUsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBTHFCLG1CQUFhLGdCQUtsQyxDQUFBO0FBQ0gsQ0FBQyxFQVBnQixLQUFLLEdBQUwsYUFBSyxLQUFMLGFBQUssUUFPckIifQ==