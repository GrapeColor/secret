import {
  ApplicationCommand,
  ApplicationCommandData,
  ButtonInteraction,
  Client,
  Collection,
  CommandInteraction,
  EmbedFieldData,
  GuildMember,
  GuildMemberRoleManager,
  Interaction,
  Message,
  MessageEmbed,
  Permissions,
  Snowflake,
  User,
} from 'discord.js';
import { APIInteractionGuildMember, APIMessage } from 'discord-api-types/v8'
import { Utils } from '../../utils';

export namespace SecretShare {
  export function initialize(bot: Client): void {
    bot.application?.commands.fetch()
      .then(commands => syncCommands(bot, commands))
      .catch(console.error);

    bot.on('interaction', interaction => receive(interaction));
  }

  const entryCommands: ApplicationCommandData[] = [
    {
      name: 'share',
      description:
        'このチャンネルにDMで最後に送信したメッセージを秘匿共有します',
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

  function syncCommands(
    bot: Client, commands: Collection<Snowflake, ApplicationCommand>
  ): void {
    const createdCommands = entryCommands
      .filter(entryCmd => !commands.some(cmd => cmd.name === entryCmd.name))
      .map(entryCmd => bot.application?.commands.create(entryCmd));

    const overwritedCommands = commands.map(cmd => {
      const overlapCmd
        = entryCommands.find(entryCmd => entryCmd.name === cmd.name);
      return overlapCmd ? cmd.edit(overlapCmd) : cmd.delete();
    });

    Promise.all(createdCommands.concat(overwritedCommands))
      .catch(console.error);
  }

  const sharingIDPrefix = 'secret-sharing-message';
  const deleteIDPrefix  = 'secret-delete-message';

  function receive(interaction: Interaction): void {
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

  async function sharingMessage(
    interaction: CommandInteraction
  ): Promise<void> {
    const author = interaction.user;
    const dmChannel = await author.createDM();
    const lastMessageID = dmChannel.lastMessageID;
    if (!lastMessageID) return;

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

  function replyResolveSharingMessage(
    interaction: CommandInteraction,
    lastMessageID: Snowflake,
    roleMentions: string[],
  ): Promise<void> {
    const embed = new MessageEmbed({
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
              customID:
                `${sharingIDPrefix},${lastMessageID}`
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

  function replyRejectSharingMessage(
    interaction: CommandInteraction
  ): Promise<void> {
    return interaction.reply({
      ephemeral: true,
      embeds: [
        {
          title: '⚠️ DMにメッセージがありません',
          description:
            '秘匿メッセージを共有するには、このBOTへDMを送る必要があります。',
        },
      ],
    });
  }

  async function trasferMessage(interaction: ButtonInteraction): Promise<void> {
    const bot = interaction.client
    const sharingMessage = interaction.message;
    const authorID = sharingMessage.interaction?.user.id;
    const member = interaction.member;
    const shareMessageID = interaction.customID.split(',')[1];

    if (!authorID || !member || !shareMessageID) return;

    if (!validateRoles(member, sharingMessage)) {
      lackRoleTransferMessage(interaction);
      return;
    }

    const author = await bot.users.fetch(authorID);
    const dmChannel = await author.createDM();
    const shareMessage
      = await dmChannel.messages.fetch(`${BigInt(shareMessageID)}`);
    const otherDMChannel = await interaction.user.createDM();

    otherDMChannel.send({
      embeds: [messgeToEmbed(shareMessage, author)],
    })
      .then(() => resolveTransferMessage(interaction))
      .catch(() => rejectTransferMessage(interaction));
  }

  function validateRoles(
    member: GuildMember | APIInteractionGuildMember,
    message: Message | APIMessage,
  ): boolean {
    const roleIDs = message.embeds[0].fields?.[0].value
      .replace(/<@&|>/g, '')
      .split(' ');

    if (!roleIDs) return true;

    const permissions = typeof member.permissions === 'string'
      ? new Permissions(BigInt(member.permissions))
      : member.permissions;
    if (permissions.has('MANAGE_MESSAGES')) return true;

    const roles = member.roles;
    if (roles instanceof GuildMemberRoleManager)
      return roleIDs.some(
        roleID => roles.cache.some(role => role.id === roleID)
      );
    else
      return roleIDs.some(
        roleID => roles.some(targetRoleID => targetRoleID === roleID)
      );
  }

  function lackRoleTransferMessage(interaction: ButtonInteraction): void {
    interaction.reply({
      ephemeral: true,
      embeds: [
        {
          title: '⚠️ 秘匿メッセージを共有できるロールがありません',
          description:
            '**共有するロール** か \`メッセージの管理\` 権限以上のロール'
            + 'だけが秘匿メッセージを受け取れます。',
        }
      ]
    })
      .catch(console.error);
  }

  function messgeToEmbed(message: Message, author: User): MessageEmbed {
    const files: Collection<string, string> = new Collection(
      message.attachments.map(file => [file.name || 'unnamed', file.url])
    );
    const filesField: EmbedFieldData = {
      name: '添付ファイル',
      value: files.map((url, name) => `[${name}](${url})`).join('\n'),
    };

    return new MessageEmbed({
      author: {
        iconURL: author.displayAvatarURL(),
        name: author.tag,
      },
      description: message.content,
      fields: files.size && filesField ? [filesField] : [],
      timestamp: message.createdTimestamp,
    });
  }

  function resolveTransferMessage(interaction: ButtonInteraction): void {
    interaction.reply({
      ephemeral: true,
      embeds: [{ title: '✅ 秘匿メッセージをDMへ送信しました' }]
    })
      .catch(console.error);
  }

  function rejectTransferMessage(interaction: ButtonInteraction): void {
    interaction.reply({
      ephemeral: true,
      embeds: [
        {
          title: '⚠️ 秘匿メッセージをDMへ送信できません',
          description:
            'サーバーにいるメンバーからのダイレクトメッセージを許可しているか、'
            + '確認してください。',
        }
      ]
    })
  }

  function deleteSharingMessage(interaction: ButtonInteraction): void {
    const channel = interaction.channel;
    const message = interaction.message;
    const author = message.interaction?.user;
    const member = interaction.member;

    if (!channel || !author || !member) return;

    if (member.user.id === author.id)
      Utils.deleteMessage(interaction.client, channel.id, message.id)
        .catch(console.error);
  }
}
