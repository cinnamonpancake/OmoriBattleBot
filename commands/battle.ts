import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import { Enemies } from "../classes/enemies.json";
import * as BattleSystem from "../battlesystem/battle_system";
import { activeBattles } from "../battlesystem/active_battles";
import * as userData from "../userdata/update_data";

const enemyKeys = Object.keys(Enemies).map(key => key = key as keyof typeof Enemies);

module.exports = {
    data: new SlashCommandBuilder()
	        .setName("battle")
	        .setDescription("Start a battle with an enemy."),

    async execute(msg: any) {
        let enemyChoiceDescription = "";

        enemyKeys.forEach((key, index) => {
            const enemy = Enemies[key];
            enemyChoiceDescription += 
            `${index + 1}: **${enemy.name}**
                HP: ${enemy.stats.maxHp}
                Defense: ${enemy.stats.defense}
                Attack: ${enemy.stats.attack}
                Speed: ${enemy.stats.speed}
                Times Beaten: ${userData.getUserData(msg.user.id).timesBeaten}
            `;
        });

        const enemyChoiceEmbed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle("Choose an enemy to battle. Reply with the number of the enemy you would like to fight. Reply with \"cancel\" to cancel.")
                .setDescription(enemyChoiceDescription)
                .setTimestamp()
        await msg.deferReply();
        await msg.editReply({ embeds: [enemyChoiceEmbed] });

        const collector = msg.channel.createMessageCollector({ 
            filter: (m: any) => m.author.id === msg.user.id,
            time: 15000
        })

        collector.on("collect", async (m: any) => {
            if (msg.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) m.delete();
            if (m.content.toLowerCase() === "cancel") return await msg.editReply({ content: "Cancelled battle.", embeds: [] });

            const index = Number(m.content) - 1;
            const selectedEnemy = Enemies[enemyKeys[index]];

            if (!isNaN(index)) {
                if (selectedEnemy) {
                    await msg.editReply(`Starting battle with ${selectedEnemy.name}...`);
                    const instance = await BattleSystem.createBattleInstance(msg, selectedEnemy);
                    await instance.listenforMenuOption();
                } else {
                    await msg.editReply("Invalid choice!");
                    return;
                }
            }
        })
    }
}

