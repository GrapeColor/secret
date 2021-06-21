"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretShare = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("../../utils");
var SecretShare;
(function (SecretShare) {
    function initialize(bot) {
        bot.application?.commands.fetch()
            .then(commands => syncCommands(bot, commands))
            .catch(console.error);
        bot.on('interaction', interaction => receive(interaction));
    }
    SecretShare.initialize = initialize;
    const entryCommands = [
        {
            name: 'share',
            description: 'このチャンネルにDMで最後に送信したメッセージを秘匿共有します',
            options: [
                {
                    type: 3,
                    name: 'roles',
                    description: '秘匿メッセージを共有するロールを指定できます(任意)',
                    required: false,
                },
            ],
        },
    ];
    function syncCommands(bot, commands) {
        const createdCommands = entryCommands
            .filter(entryCmd => !commands.some(cmd => cmd.name === entryCmd.name))
            .map(entryCmd => bot.application?.commands.create(entryCmd));
        const overwritedCommands = commands.map(cmd => {
            const overlapCmd = entryCommands.find(entryCmd => entryCmd.name === cmd.name);
            return overlapCmd ? cmd.edit(overlapCmd) : cmd.delete();
        });
        Promise.all(createdCommands.concat(overwritedCommands))
            .catch(console.error);
    }
    const sharingIDPrefix = 'secret-sharing-message';
    const deleteIDPrefix = 'secret-delete-message';
    function receive(interaction) {
        if (interaction.isCommand())
            if (interaction.commandName === 'share')
                sharingMessage(interaction).catch(console.error);
        if (interaction.isButton()) {
            const customID = interaction.customID;
            if (customID.startsWith(sharingIDPrefix))
                trasferMessage(interaction)
                    .catch(console.error);
            if (customID.startsWith(deleteIDPrefix))
                deleteSharingMessage(interaction);
        }
    }
    async function sharingMessage(interaction) {
        const author = interaction.user;
        const dmChannel = await author.createDM();
        const lastMessageID = dmChannel.lastMessageID;
        if (!lastMessageID)
            return;
        const lastMessage = await dmChannel.messages.fetch(lastMessageID);
        if (author.id === lastMessage.author.id) {
            const rolesString = interaction.options.get('roles')?.value;
            const mentions = typeof rolesString === 'string'
                ? [...rolesString.matchAll(/(?<!\\)<@&\d+>/g)].map(match => match[0])
                : [];
            await replyResolveSharingMessage(interaction, lastMessageID, mentions);
        }
        else
            await replyRejectSharingMessage(interaction);
    }
    function replyResolveSharingMessage(interaction, lastMessageID, roleMentions) {
        const embed = new discord_js_1.MessageEmbed({
            title: '📨 秘匿メッセージが共有されました'
        });
        if (roleMentions.length)
            embed.addField('共有するロール', roleMentions.join(' '));
        return interaction.reply({
            embeds: [embed],
            components: [
                {
                    type: 'ACTION_ROW',
                    components: [
                        {
                            type: 'BUTTON',
                            style: 'PRIMARY',
                            label: 'DMでメッセージを受け取る',
                            customID: `${sharingIDPrefix},${lastMessageID}`
                        },
                        {
                            type: 'BUTTON',
                            style: 'DANGER',
                            label: '削除',
                            customID: deleteIDPrefix
                        },
                    ],
                },
            ],
        });
    }
    function replyRejectSharingMessage(interaction) {
        return interaction.reply({
            ephemeral: true,
            embeds: [
                {
                    title: '⚠️ DMにメッセージがありません',
                    description: '秘匿メッセージを共有するには、このBOTへDMを送る必要があります。',
                },
            ],
        });
    }
    async function trasferMessage(interaction) {
        const bot = interaction.client;
        const sharingMessage = interaction.message;
        const authorID = sharingMessage.interaction?.user.id;
        const member = interaction.member;
        const shareMessageID = interaction.customID.split(',')[1];
        if (!authorID || !member || !shareMessageID)
            return;
        if (!validateRoles(member, sharingMessage)) {
            lackRoleTransferMessage(interaction);
            return;
        }
        const author = await bot.users.fetch(authorID);
        const dmChannel = await author.createDM();
        const shareMessage = await dmChannel.messages.fetch(`${BigInt(shareMessageID)}`);
        const otherDMChannel = await interaction.user.createDM();
        otherDMChannel.send({
            embeds: [messgeToEmbed(shareMessage, author)],
        })
            .then(() => resolveTransferMessage(interaction))
            .catch(() => rejectTransferMessage(interaction));
    }
    function validateRoles(member, message) {
        const roleIDs = message.embeds[0].fields?.[0].value
            .replace(/<@&|>/g, '')
            .split(' ');
        if (!roleIDs)
            return true;
        const permissions = typeof member.permissions === 'string'
            ? new discord_js_1.Permissions(BigInt(member.permissions))
            : member.permissions;
        if (permissions.has('MANAGE_MESSAGES'))
            return true;
        const roles = member.roles;
        if (roles instanceof discord_js_1.GuildMemberRoleManager)
            return roleIDs.some(roleID => roles.cache.some(role => role.id === roleID));
        else
            return roleIDs.some(roleID => roles.some(targetRoleID => targetRoleID === roleID));
    }
    function lackRoleTransferMessage(interaction) {
        interaction.reply({
            ephemeral: true,
            embeds: [
                {
                    title: '⚠️ 秘匿メッセージを共有できるロールがありません',
                    description: '**共有するロール** か \`メッセージの管理\` 権限以上のロール'
                        + 'だけが秘匿メッセージを受け取れます。',
                }
            ]
        })
            .catch(console.error);
    }
    function messgeToEmbed(message, author) {
        const files = new discord_js_1.Collection(message.attachments.map(file => [file.name || 'unnamed', file.url]));
        const filesField = {
            name: '添付ファイル',
            value: files.map((url, name) => `[${name}](${url})`).join('\n'),
        };
        return new discord_js_1.MessageEmbed({
            author: {
                iconURL: author.displayAvatarURL(),
                name: author.tag,
            },
            description: message.content,
            fields: files.size && filesField ? [filesField] : [],
            timestamp: message.createdTimestamp,
        });
    }
    function resolveTransferMessage(interaction) {
        interaction.reply({
            ephemeral: true,
            embeds: [{ title: '✅ 秘匿メッセージをDMへ送信しました' }]
        })
            .catch(console.error);
    }
    function rejectTransferMessage(interaction) {
        interaction.reply({
            ephemeral: true,
            embeds: [
                {
                    title: '⚠️ 秘匿メッセージをDMへ送信できません',
                    description: 'サーバーにいるメンバーからのダイレクトメッセージを許可しているか、'
                        + '確認してください。',
                }
            ]
        });
    }
    function deleteSharingMessage(interaction) {
        const channel = interaction.channel;
        const message = interaction.message;
        const author = message.interaction?.user;
        const member = interaction.member;
        if (!channel || !author || !member)
            return;
        if (member.user.id === author.id)
            utils_1.Utils.deleteMessage(interaction.client, channel.id, message.id)
                .catch(console.error);
    }
})(SecretShare = exports.SecretShare || (exports.SecretShare = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYm90L2ludGVyYWN0aW9ucy9zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FnQm9CO0FBRXBCLHVDQUFvQztBQUVwQyxJQUFpQixXQUFXLENBZ1EzQjtBQWhRRCxXQUFpQixXQUFXO0lBQzFCLFNBQWdCLFVBQVUsQ0FBQyxHQUFXO1FBQ3BDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRTthQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzdDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFeEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBTmUsc0JBQVUsYUFNekIsQ0FBQTtJQUVELE1BQU0sYUFBYSxHQUE2QjtRQUM5QztZQUNFLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUNULGlDQUFpQztZQUNuQyxPQUFPLEVBQUU7Z0JBQ1A7b0JBQ0UsSUFBSSxFQUFFLENBQUM7b0JBQ1AsSUFBSSxFQUFFLE9BQU87b0JBQ2IsV0FBVyxFQUFFLDRCQUE0QjtvQkFDekMsUUFBUSxFQUFFLEtBQUs7aUJBQ2hCO2FBQ0Y7U0FDRjtLQUNGLENBQUM7SUFFRixTQUFTLFlBQVksQ0FDbkIsR0FBVyxFQUFFLFFBQW1EO1FBRWhFLE1BQU0sZUFBZSxHQUFHLGFBQWE7YUFDbEMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDckUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFL0QsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzVDLE1BQU0sVUFBVSxHQUNaLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRCxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFELENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDcEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsTUFBTSxlQUFlLEdBQUcsd0JBQXdCLENBQUM7SUFDakQsTUFBTSxjQUFjLEdBQUksdUJBQXVCLENBQUM7SUFFaEQsU0FBUyxPQUFPLENBQUMsV0FBd0I7UUFDdkMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFO1lBQ3pCLElBQUksV0FBVyxDQUFDLFdBQVcsS0FBSyxPQUFPO2dCQUNyQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVyRCxJQUFJLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUMxQixNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDO1lBQ3RDLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7Z0JBQ3RDLGNBQWMsQ0FBQyxXQUFXLENBQUM7cUJBQ3hCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztnQkFDckMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDckM7SUFDSCxDQUFDO0lBRUQsS0FBSyxVQUFVLGNBQWMsQ0FDM0IsV0FBK0I7UUFFL0IsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQztRQUNoQyxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMxQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDO1FBQzlDLElBQUksQ0FBQyxhQUFhO1lBQUUsT0FBTztRQUUzQixNQUFNLFdBQVcsR0FBRyxNQUFNLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWxFLElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTtZQUN2QyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUM7WUFDNUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxXQUFXLEtBQUssUUFBUTtnQkFDOUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFUCxNQUFNLDBCQUEwQixDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDeEU7O1lBRUMsTUFBTSx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FDakMsV0FBK0IsRUFDL0IsYUFBd0IsRUFDeEIsWUFBc0I7UUFFdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSx5QkFBWSxDQUFDO1lBQzdCLEtBQUssRUFBRSxvQkFBb0I7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxZQUFZLENBQUMsTUFBTTtZQUNyQixLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEQsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ3ZCLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztZQUNmLFVBQVUsRUFBRTtnQkFDVjtvQkFDRSxJQUFJLEVBQUUsWUFBWTtvQkFDbEIsVUFBVSxFQUFFO3dCQUNWOzRCQUNFLElBQUksRUFBRSxRQUFROzRCQUNkLEtBQUssRUFBRSxTQUFTOzRCQUNoQixLQUFLLEVBQUUsZUFBZTs0QkFDdEIsUUFBUSxFQUNOLEdBQUcsZUFBZSxJQUFJLGFBQWEsRUFBRTt5QkFDeEM7d0JBQ0Q7NEJBQ0UsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsS0FBSyxFQUFFLFFBQVE7NEJBQ2YsS0FBSyxFQUFFLElBQUk7NEJBQ1gsUUFBUSxFQUFFLGNBQWM7eUJBQ3pCO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FDaEMsV0FBK0I7UUFFL0IsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ3ZCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTSxFQUFFO2dCQUNOO29CQUNFLEtBQUssRUFBRSxtQkFBbUI7b0JBQzFCLFdBQVcsRUFDVCxvQ0FBb0M7aUJBQ3ZDO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxVQUFVLGNBQWMsQ0FBQyxXQUE4QjtRQUMxRCxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1FBQzlCLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFDbEMsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWM7WUFBRSxPQUFPO1FBRXBELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxFQUFFO1lBQzFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JDLE9BQU87U0FDUjtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUMsTUFBTSxZQUFZLEdBQ2QsTUFBTSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEUsTUFBTSxjQUFjLEdBQUcsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRXpELGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEIsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM5QyxDQUFDO2FBQ0MsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQy9DLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FDcEIsTUFBK0MsRUFDL0MsT0FBNkI7UUFFN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2FBQ2hELE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2FBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVkLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFFMUIsTUFBTSxXQUFXLEdBQUcsT0FBTyxNQUFNLENBQUMsV0FBVyxLQUFLLFFBQVE7WUFDeEQsQ0FBQyxDQUFDLElBQUksd0JBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQ3ZCLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRXBELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDM0IsSUFBSSxLQUFLLFlBQVksbUNBQXNCO1lBQ3pDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FDakIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLENBQ3ZELENBQUM7O1lBRUYsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUNqQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEtBQUssTUFBTSxDQUFDLENBQzlELENBQUM7SUFDTixDQUFDO0lBRUQsU0FBUyx1QkFBdUIsQ0FBQyxXQUE4QjtRQUM3RCxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ2hCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTSxFQUFFO2dCQUNOO29CQUNFLEtBQUssRUFBRSwyQkFBMkI7b0JBQ2xDLFdBQVcsRUFDVCxxQ0FBcUM7MEJBQ25DLG9CQUFvQjtpQkFDekI7YUFDRjtTQUNGLENBQUM7YUFDQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxPQUFnQixFQUFFLE1BQVk7UUFDbkQsTUFBTSxLQUFLLEdBQStCLElBQUksdUJBQVUsQ0FDdEQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNwRSxDQUFDO1FBQ0YsTUFBTSxVQUFVLEdBQW1CO1lBQ2pDLElBQUksRUFBRSxRQUFRO1lBQ2QsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDaEUsQ0FBQztRQUVGLE9BQU8sSUFBSSx5QkFBWSxDQUFDO1lBQ3RCLE1BQU0sRUFBRTtnQkFDTixPQUFPLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFO2dCQUNsQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUc7YUFDakI7WUFDRCxXQUFXLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDNUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BELFNBQVMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCO1NBQ3BDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFDLFdBQThCO1FBQzVELFdBQVcsQ0FBQyxLQUFLLENBQUM7WUFDaEIsU0FBUyxFQUFFLElBQUk7WUFDZixNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1NBQzNDLENBQUM7YUFDQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLFdBQThCO1FBQzNELFdBQVcsQ0FBQyxLQUFLLENBQUM7WUFDaEIsU0FBUyxFQUFFLElBQUk7WUFDZixNQUFNLEVBQUU7Z0JBQ047b0JBQ0UsS0FBSyxFQUFFLHVCQUF1QjtvQkFDOUIsV0FBVyxFQUNULG1DQUFtQzswQkFDakMsV0FBVztpQkFDaEI7YUFDRjtTQUNGLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLFdBQThCO1FBQzFELE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQztRQUN6QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBRWxDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUUzQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FBQyxFQUFFO1lBQzlCLGFBQUssQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7aUJBQzVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUIsQ0FBQztBQUNILENBQUMsRUFoUWdCLFdBQVcsR0FBWCxtQkFBVyxLQUFYLG1CQUFXLFFBZ1EzQiJ9