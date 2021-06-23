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
                    type: 'STRING',
                    name: 'summary',
                    description: '秘匿メッセージの要約を指定できます(任意)',
                    required: false,
                },
                {
                    type: 'STRING',
                    name: 'roles',
                    description: '秘匿メッセージを共有するロールを指定できます(任意・複数可)',
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
                sharingMessage(interaction)
                    .catch(exception => unknownError(interaction, exception));
        if (interaction.isButton()) {
            const customID = interaction.customID;
            if (customID.startsWith(sharingIDPrefix))
                trasferMessage(interaction)
                    .catch(exception => unknownError(interaction, exception));
            if (customID.startsWith(deleteIDPrefix))
                deleteSharingMessage(interaction)
                    .catch(exception => unknownError(interaction, exception));
        }
    }
    function unknownError(interaction, exception) {
        console.error(exception);
        if (!interaction.isCommand()
            && !interaction.isButton()
            && !interaction.isMessageComponent())
            return;
        interaction.reply({
            ephemeral: true,
            embeds: [{ title: '⚠️ 不明なエラーが発生しました' }],
        })
            .catch(console.error);
    }
    async function sharingMessage(interaction) {
        const author = interaction.user;
        const dmChannel = await author.createDM();
        const lastMessageID = dmChannel.lastMessageID;
        if (!lastMessageID)
            return;
        const lastMessage = await dmChannel.messages.fetch(lastMessageID);
        if (author.id === lastMessage.author.id)
            await replyResolveSharingMessage(interaction, lastMessageID);
        else
            await replyRejectSharingMessage(interaction);
    }
    function replyResolveSharingMessage(interaction, lastMessageID) {
        const embed = new discord_js_1.MessageEmbed({
            title: '📨 秘匿メッセージが共有されました'
        });
        const summary = interaction.options.get('summary')?.value;
        const rolesString = interaction.options.get('roles')?.value;
        if (typeof summary === 'string')
            embed.setDescription(summary);
        if (typeof rolesString === 'string')
            embed.addField('共有するロール', [...rolesString.matchAll(/(?<!\\)<@&\d+>/g)].map(m => m[0]).join(' '));
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
        if (!validateRoles(member, sharingMessage))
            return lackRoleTransferMessage(interaction);
        const author = await bot.users.fetch(authorID);
        const dmChannel = await author.createDM();
        const shareMessage = await utils_1.Utils.fetchMessage(bot, dmChannel.id, shareMessageID);
        if (!shareMessage)
            return notFoundTranceferMessage(interaction);
        const otherDMChannel = await interaction.user.createDM();
        otherDMChannel.send({
            embeds: [messgeToEmbed(shareMessage, author)],
        })
            .then(() => resolveTransferMessage(interaction))
            .catch(() => rejectTransferMessage(interaction));
    }
    function validateRoles(member, message) {
        const roleIDs = message.embeds[0].fields?.[0]?.value
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
        return interaction.reply({
            ephemeral: true,
            embeds: [
                {
                    title: '⚠️ 秘匿メッセージを共有できるロールがありません',
                    description: '**共有するロール** か \`メッセージの管理\` 権限以上のロール'
                        + 'だけが秘匿メッセージを受け取れます。',
                }
            ]
        });
    }
    function notFoundTranceferMessage(interaction) {
        return interaction.reply({
            ephemeral: true,
            embeds: [{ title: '⚠️ 秘匿メッセージが削除されました' }],
        });
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
            embeds: [{ title: '✅ 秘匿メッセージをDMへ送信しました' }],
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
    async function deleteSharingMessage(interaction) {
        const channel = interaction.channel;
        const message = interaction.message;
        const author = message.interaction?.user;
        const member = interaction.member;
        if (!channel || !author || !member)
            return;
        if (member.user.id === author.id)
            await utils_1.Utils.deleteMessage(interaction.client, channel.id, message.id);
        else
            await interaction.reply({
                ephemeral: true,
                embeds: [{ title: '⚠️ このメッセージは本人のみが削除できます' }],
            });
    }
})(SecretShare = exports.SecretShare || (exports.SecretShare = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYm90L2ludGVyYWN0aW9ucy9zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FnQm9CO0FBRXBCLHVDQUFvQztBQUVwQyxJQUFpQixXQUFXLENBc1MzQjtBQXRTRCxXQUFpQixXQUFXO0lBQzFCLFNBQWdCLFVBQVUsQ0FBQyxHQUFXO1FBQ3BDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRTthQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzdDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFeEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBTmUsc0JBQVUsYUFNekIsQ0FBQTtJQUVELE1BQU0sYUFBYSxHQUE2QjtRQUM5QztZQUNFLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUNULGlDQUFpQztZQUNuQyxPQUFPLEVBQUU7Z0JBQ1A7b0JBQ0UsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsV0FBVyxFQUFFLHVCQUF1QjtvQkFDcEMsUUFBUSxFQUFFLEtBQUs7aUJBQ2hCO2dCQUNEO29CQUNFLElBQUksRUFBRSxRQUFRO29CQUNkLElBQUksRUFBRSxPQUFPO29CQUNiLFdBQVcsRUFBRSxnQ0FBZ0M7b0JBQzdDLFFBQVEsRUFBRSxLQUFLO2lCQUNoQjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBRUYsU0FBUyxZQUFZLENBQ25CLEdBQVcsRUFBRSxRQUFtRDtRQUVoRSxNQUFNLGVBQWUsR0FBRyxhQUFhO2FBQ2xDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFD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