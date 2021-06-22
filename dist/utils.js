"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
var Utils;
(function (Utils) {
    async function fetchMessage(bot, channelID, messageID) {
        const channel = bot.channels.cache.get(`${BigInt(channelID)}`);
        if (!channel?.isText())
            return;
        try {
            const message = await channel.messages.fetch(`${BigInt(messageID)}`);
            return message;
        }
        catch {
            return;
        }
    }
    Utils.fetchMessage = fetchMessage;
    async function deleteMessage(bot, channelID, messageID) {
        const channel = bot.channels.cache.get(`${BigInt(channelID)}`);
        if (channel?.isText())
            await channel.messages.delete(`${BigInt(messageID)}`);
    }
    Utils.deleteMessage = deleteMessage;
})(Utils = exports.Utils || (exports.Utils = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsSUFBaUIsS0FBSyxDQXNCckI7QUF0QkQsV0FBaUIsS0FBSztJQUNiLEtBQUssVUFBVSxZQUFZLENBQ2hDLEdBQVcsRUFBRSxTQUE2QixFQUFFLFNBQTZCO1FBRXpFLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7WUFBRSxPQUFPO1FBRS9CLElBQUk7WUFDRixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNyRSxPQUFPLE9BQU8sQ0FBQztTQUNoQjtRQUNELE1BQU07WUFDSixPQUFPO1NBQ1I7SUFDSCxDQUFDO0lBYnFCLGtCQUFZLGVBYWpDLENBQUE7SUFFTSxLQUFLLFVBQVUsYUFBYSxDQUNqQyxHQUFXLEVBQUUsU0FBNkIsRUFBRSxTQUE2QjtRQUV6RSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRTtZQUFFLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFMcUIsbUJBQWEsZ0JBS2xDLENBQUE7QUFDSCxDQUFDLEVBdEJnQixLQUFLLEdBQUwsYUFBSyxLQUFMLGFBQUssUUFzQnJCIn0=