import { PartyMember, Enemy, Skill, State, Item, Armor, Weapon, EmoDamageRate, ItemProperties, BaseStates } from "../classes/battle_data";
import { Battle } from "../classes/battler";
import * as BaseSkills from "../classes/skills";
import { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageComponentBuilder, ActionRow } from "discord.js";
import { activeBattles } from "./active_battles";
import * as userData from "../userdata/update_data";
import path from "path";

const userFilter = (i: any) => Object.keys(activeBattles).includes(i.user.id);

const backButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel("BACK")
    .setCustomId("BACK");

interface SelectedAction {
    partyMember: PartyMember,
    actionType: string,
    target: Enemy | PartyMember,
    actionObject?: Skill | Item | void
}

export async function createBattleInstance(interaction: any, enemyChoice: any) {
    const enemy = new Enemy({
        maxHp: enemyChoice.stats.maxHp,
        attack: enemyChoice.stats.attack,
        speed: enemyChoice.stats.speed,
        defense: enemyChoice.stats.defense,
        luck: enemyChoice.stats.luck,
        hitRate: enemyChoice.stats.hitRate,
        maxJuice: 1000000
    }, enemyChoice.name, enemyChoice.battleImage, enemyChoice.thirdStageEmotions)

    // <temp skills>
    enemy.addSkill(enemy.stats.speed * 3, 45, "VERTIGO", "Deals damage to all foes based on user's SPEED and greatly reduces their ATTACK.\nCosts 45 JUICE.");
    enemy.addSkill(enemy.stats.attack * 3.5, 45, "CRIPPLE", "Deals big damage to all foes and greatly reduces their SPEED.\nCosts 45 JUICE.");
    enemy.addSkill(enemy.stats.attack * 3, 75, "RED HANDS", "Deals big damage 4 times. Costs 75 JUICE.");
    enemy.addSkill(400, 45, "SUFFOCATE", "Deals 400 damage to all foes and greatly reduces their DEFENSE. Costs 45 JUICE.");
    // </temp skills>

    const OMORI = new PartyMember(50, "OMORI", true);
    const AUBREY = new PartyMember(50, "AUBREY");
    const KEL = new PartyMember(50, "KEL");
    const HERO = new PartyMember(50, "HERO");
    BaseSkills.initOmoriSkills(OMORI);
    BaseSkills.initAubreySkills(AUBREY);
    BaseSkills.initKelSkills(KEL);
    BaseSkills.initHeroSkills(HERO);

    const RedKnife = new Weapon({
        maxHp: 0,
        attack: 13,
        defense: 6,
        speed: 6,
        luck: 6,
        hitRate: 100,
        maxJuice: 0
    }, "RED KNIFE", "A shiny new knife.\nYou can see something in the blade.");
    const GladiolusHairband = new Armor({
        maxHp: 0,
        attack: 10,
        defense: 0,
        speed: 0,
        luck: 10,
        hitRate: 100,
        maxJuice: 0
    }, "GLADIOLUS HAIRBAND", "Represents strength of character.\nATK +10, LUCK +10, Increases HIT RATE.")
    RedKnife.equip(OMORI);
    GladiolusHairband.equip(OMORI);

    const battle = new Battle([OMORI, AUBREY, KEL, HERO], [enemy]);

    battle.inventory.addItem("SNO-CONE", "Heals a friend's HEART and JUICE, and raises ALL STATS for the battle.", {
        hpHeal: 999,
        juiceHeal: 999,
    }, 5)
    battle.inventory.addItem("CHEESEBURGER", "Contains all food groups, so it's healthy! Heals 250 HEART. ", {
        hpHeal: 250,
        juiceHeal: 0,
    }, 10)
    battle.inventory.addItem("SPARKLER", "Little fires. Inflicts HAPPY on a friend or foe.", {
        hpHeal: 0,
        juiceHeal: 0,
        states: [BaseStates.HAPPY],
        isToy: true
    }, 10)

    const thisBattleInstance = new BattleInstance(battle, interaction);
    const ui = thisBattleInstance.createBattleUI();

    thisBattleInstance.battleUI = await interaction.editReply({ content: "", embeds: ui.embeds, components: ui.components});

    activeBattles[interaction.user.id as keyof typeof activeBattles] = thisBattleInstance;

    userData.increaseAttempts(interaction.user.id);

    return thisBattleInstance;
}

export class BattleInstance {
    constructor(battle: Battle, interaction: any) {
        this.battle = battle;
        this.interaction = interaction;
    }

    battle: Battle;
    interaction: any;
    selectedActions: SelectedAction[] = [];
    battleUI?: any;
    battleLog: string[] = [];
    currentPartyMemberIndex: number = 0;
    startTime: number = Math.floor(Date.now() / 1000);

    
    async listenforMenuOption() {
        const option = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 });
        await option.deferUpdate();
    
        const currentPartyMember = this.battle.alivePartyMembers[this.currentPartyMemberIndex];
    
        const selectedAction: SelectedAction = {
            partyMember: currentPartyMember,
            actionType: option.customId,
            target: this.battle.aliveEnemies[0], // default value
            actionObject: undefined
        }
    
        switch (option.customId) {
            case "⚔️ ATTACK":
                selectedAction.actionObject = new Skill(currentPartyMember.stats.attack * 3, 0, "ATTACK", "Default attack");
                if (!selectedAction.actionObject || selectedAction.target === Enemy.prototype) return;
                selectedAction.target = await this.selectTarget();
                break;
            case "✨ SKILL":
                selectedAction.actionObject = await this.selectSkill();
                if (!selectedAction.actionObject || selectedAction.target === Enemy.prototype) return;
                selectedAction.target = await this.selectTarget();
                break;
            case "🍬 SNACK":
                selectedAction.actionObject = await this.selectSnack();
                if (!selectedAction.actionObject || selectedAction.target === Enemy.prototype) return;
                selectedAction.target = await this.selectTarget(true);
                break;
            case "🎉 TOY":
                selectedAction.actionObject = await this.selectToy();
                if (!selectedAction.actionObject || selectedAction.target === Enemy.prototype) return;
                selectedAction.target = await this.selectTarget(true);
                break;
            case "BACK":
                await this.goBack(true);
                return;
        }
    
        this.selectedActions.push(selectedAction);
    
        this.currentPartyMemberIndex++;
    
        if (this.currentPartyMemberIndex > this.battle.alivePartyMembers.length - 1) 
            return this.executeTurn().next();

        await this.updateBattleUI();
        await this.listenforMenuOption();
    }
    
    createBattleButtons() {
        const attackButton = new ButtonBuilder()
            .setCustomId("⚔️ ATTACK")
            .setLabel("⚔️ ATTACK")
            .setStyle(ButtonStyle.Danger);
        
        const skillButton = new ButtonBuilder()
            .setCustomId("✨ SKILL")
            .setLabel("✨ SKILL")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.battle.alivePartyMembers[this.currentPartyMemberIndex].skills.length < 1)
    
        const snackButton = new ButtonBuilder()
            .setCustomId("🍬 SNACK")
            .setLabel("🍬 SNACK")
            .setStyle(ButtonStyle.Success)
            .setDisabled(this.battle.inventory.snacks.length < 1);
    
        const toyButton = new ButtonBuilder()
            .setCustomId("🎉 TOY")
            .setLabel("🎉 TOY")
            .setStyle(ButtonStyle.Success)
            .setDisabled(this.battle.inventory.toys.length < 1);

        const disableableBackButton = new ButtonBuilder()
            .setCustomId("BACK")
            .setLabel("BACK")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.currentPartyMemberIndex < 1)
            // my god why is it so hard to make deep copies of objects with functions i have to remake the same button twice
            // just to make it disableable i fucking hateyhbvwehubv hjv bdfytugjvfbdtyuj

        
        return new ActionRowBuilder().addComponents(attackButton, skillButton, snackButton, toyButton, disableableBackButton);
    }

    getEmotionEmoji(target: PartyMember) {
        const name = target.name.toLowerCase();
        const emotion = BaseStates.getEmotionName(target).toLowerCase();

        return this.interaction.guild.emojis.cache.find((e: any) => e.name === `${name}_${emotion}`) ?? ":slight_smile:";
    }
    
    createBattleUI() {
        const enemies = this.battle.allEnemies;
        const allEnemyNames = enemies.map(enemy => enemy.name).join(", ");
    
        const battleEmbed = new EmbedBuilder()
            .setAuthor({ name: `Turn #${this.battle.turn}:` })
            .setColor("Aqua")
            .setTitle(`BATTLING: **${allEnemyNames}**\n:heart: HP: ${enemies[0].hp}/${enemies[0].stats.maxHp}\n:slight_smile: EMOTION: ${BaseStates.getEmotionName(enemies[0])}`)
            .setDescription(`**What will ${this.battle.alivePartyMembers[this.currentPartyMemberIndex].name} do?**`)
            .setThumbnail(enemies[0].battleImage ?? null)
            .setTimestamp();
    
        this.battle.allPartyMembers.forEach((member, index) => {
            const selectedAction = this.selectedActions[index]?.actionType ?? "NONE";
            const selectedObject = !["⚔️ ATTACK", "NONE"].includes(selectedAction) ? `(${this.selectedActions[index].actionObject?.name} on ${this.selectedActions[index].target?.name})` : "";
            battleEmbed.addFields({ 
                name: member.name,
                value:  `${this.getEmotionEmoji(member)} EMOTION: **${BaseStates.getEmotionName(member)}**
                    :heart: HP: ${member.hp}/${member.stats.maxHp}
                    💧 Juice: ${member.juice}/${member.stats.maxJuice}
                    👕 Armor: ${member.armor?.name ?? "NONE"}
                    🗡️ Weapon: ${member.weapon?.name ?? "NONE"}
                    🛠 Selected Action:\n**${selectedAction}\n${selectedObject}**`,
                inline: true
            })
        })
    
        return { 
            embeds: [battleEmbed],
            components: [this.createBattleButtons()]
        };
    }

    async updateBattleUI() {
        await this.battleUI.edit(this.createBattleUI());
    }
    
    async selectTarget(selectPartyMember?: boolean) {
        const selectEmbed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("**Use on who?**");
        const buttons: ButtonBuilder[] = [];

        const actors = selectPartyMember ? this.battle.alivePartyMembers : this.battle.aliveEnemies;

        for (const actor of actors) {
            const emotionEmoji = actor instanceof PartyMember ? this.getEmotionEmoji(actor) : ":slight_smile:";
            selectEmbed.addFields({
                name: actor.name,
                value: `:heart: HP: **${actor.hp}/${actor.stats.maxHp}**
                    ${actor instanceof PartyMember ? `💧 JUICE: **${actor.juice}/${actor.stats.maxJuice}**` : ""}
                    ${emotionEmoji} Emotion: **${BaseStates.getEmotionName(actor)}**`,
                inline: true
            })
            buttons.push(new ButtonBuilder()
                .setStyle(selectPartyMember ? ButtonStyle.Primary : ButtonStyle.Danger)
                .setLabel(actor.name)
                .setCustomId(actor.name)
            );
    }
    
        const row = new ActionRowBuilder()
            .addComponents(...buttons, backButton);
    
        await this.battleUI.edit({ embeds: [selectEmbed], components: [row]});
    
        const targetChoice = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 })
        await targetChoice.deferUpdate();

        const selectedTarget = selectPartyMember ? this.battle.alivePartyMembers.find(member => member.name === targetChoice.customId) :
            this.battle.aliveEnemies.find(enemy => enemy.name === targetChoice.customId);
        
        if (targetChoice.customId === "BACK") {
            await this.goBack();
            return Enemy.prototype; // basically undefined
        }
        return selectedTarget ?? this.battle.aliveEnemies[0];
    }
    
    async selectSkill() {
            const currentPartyMember = this.battle.alivePartyMembers[this.currentPartyMemberIndex];
        
            const skillsEmbed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle(`Select a skill for ${currentPartyMember.name}.\nCurrent Juice: 💧 **${currentPartyMember.juice}**`);
            const buttons: ButtonBuilder[] = [];
        
            for (const skill of currentPartyMember.skills) {
                skillsEmbed.addFields({
                    name: skill.name,
                    value: `${skill.description}\n💧 **Cost: ${skill.juiceCost}**`,
                    inline: true
                })
                buttons.push(new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel(skill.name)
                    .setCustomId(skill.name)
                    .setDisabled(currentPartyMember.juice < skill.juiceCost)
                );
            }
        
            const row = new ActionRowBuilder()
                .addComponents(...buttons, backButton);
        
            await this.battleUI.edit({ embeds: [skillsEmbed], components: [row]});
        
            const skillChoice = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 })
            await skillChoice.deferUpdate();
        
            if (skillChoice.customId === "BACK") return await this.goBack();
            return BaseSkills.getSkillByName(currentPartyMember, skillChoice.customId);
    }
    
     async selectSnack() {
        const inventory = this.battle.inventory;
    
        const itemsEmbed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`Select a snack to use:`);
        const buttons: ButtonBuilder[] = [];
    
        const snacksNoDupes = [...new Set(inventory.snacks)];
    
        for (const snack of snacksNoDupes) {
            const amount = inventory.snacks.filter(s => s === snack).length;
    

            const hpHealGreaterThanPartyHP = snack.properties.hpHeal >= Math.max(...this.battle.alivePartyMembers.map(m => m.stats.maxHp));
            const juiceHealGreaterThanPartyJuice = snack.properties.juiceHeal >= Math.max(...this.battle.alivePartyMembers.map(m => m.stats.maxJuice));

            const hp = hpHealGreaterThanPartyHP ? "MAX" : snack.properties.hpHeal;
            const juice = juiceHealGreaterThanPartyJuice ? "MAX" : snack.properties.juiceHeal;
            
            itemsEmbed.addFields({
                name: `${snack.name} x${amount}`,
                value: `${snack.description}\nHeals: \n:heart: **${hp} HP**
                ${snack.properties.juiceHeal > 0 ? `💧 **${juice} JUICE**` : ""}`, // check if item heals juice and only display the juice amount if so
                inline: true
            })
            buttons.push(new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(snack.name)
                .setCustomId(snack.name)
            );
        }
    
        const row = new ActionRowBuilder()
            .addComponents(...buttons, backButton);
    
        await this.battleUI.edit({ embeds: [itemsEmbed], components: [row]});
    
        const itemChoice = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 })
        await itemChoice.deferUpdate();
    
        if (itemChoice.customId === "BACK") return await this.goBack();
        return inventory.getItemsByName(itemChoice.customId)[0];
    }
    
     async selectToy() {
        const inventory = this.battle.inventory;
    
        const itemsEmbed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`Select a toy to use:`);
        const buttons: ButtonBuilder[] = [];
    
        const toysNoDupes = [...new Set(inventory.toys)];
    
        for (const toy of toysNoDupes) {
            const amount = inventory.toys.filter(t => t === toy).length;
            itemsEmbed.addFields({
                name: `${toy.name} x${amount}`,
                value: toy.description,
                inline: true
            })
            buttons.push(new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(toy.name)
                .setCustomId(toy.name)
            );
        }
    
        const row = new ActionRowBuilder()
            .addComponents(...buttons, backButton);
    
        await this.battleUI.edit({ embeds: [itemsEmbed], components: [row]});
    
        const itemChoice = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 })
        await itemChoice.deferUpdate();
    
        if (itemChoice.customId === "BACK") return await this.goBack();
        return inventory.getItemsByName(itemChoice.customId)[0];
    }

    async goBack(toPreviousPartyMember?: boolean) {
        if (toPreviousPartyMember) {
            this.currentPartyMemberIndex--;
            this.selectedActions.pop();
        }
    
        await this.updateBattleUI();
        await this.listenforMenuOption();
    }

    getElapsedTime() {
        const currentUnixTime = Math.floor(Date.now() / 1000);
        const totalElapsedSeconds = currentUnixTime - this.startTime;
        const elapsedMinutes = Math.floor(totalElapsedSeconds / 60);
        const seconds = Math.floor(totalElapsedSeconds % 60);

        return `${elapsedMinutes}:${seconds}`;
    }
    
    async updateBattleLog(text: string) {
        this.battleLog.push(`${this.getElapsedTime()} - **${text}**`);
        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle(`Battle Log for Turn ${this.battle.turn}:`)
            .setDescription(this.battleLog.join("\n"))
            .setTimestamp();

        await this.battleUI.edit({ embeds: [embed], components: []});
    }

    async *executeTurn() {
        const actionOrder = 
            [...this.selectedActions.map(act => act.partyMember), ...this.battle.aliveEnemies]
            .sort((a, b) => b.stats.speed - a.stats.speed);

        for (const actor of actionOrder) {
            if (actor instanceof Enemy) {
                const randomSkillIndex = Math.floor(Math.random() * actor.skills.length);
                const randomSkill = actor.skills[randomSkillIndex];
        
                const randomPartyMember = this.battle.alivePartyMembers[Math.floor(Math.random() * this.battle.alivePartyMembers.length)];
                actor.useSkill(randomSkillIndex, randomPartyMember, this.battle, randomSkill.properties?.attackType);
        
                const damage = this.battle.damageLog[0];
                await this.updateBattleLog(`${actor.name} used ${randomSkill.name}!`);
        
                if (damage > 0)
                    await this.updateBattleLog(`${randomPartyMember.name} recovered ${damage} HP`!);
                else if (damage === 0) 
                    await this.updateBattleLog(`**${randomPartyMember.name}'s attack whiffed!**`);
                else
                    await this.updateBattleLog(`${randomPartyMember.name} took ${-damage} damage!`);

                if (this.battle.battleEndStatus === Battle.Loss) return await this.loseBattle();
            } else {
                const action = this.selectedActions.find(act => act.partyMember.name === actor.name);

                switch (action?.actionType) {
                    case "⚔️ ATTACK": {
                        const formula = actor.stats.attack * 3;
                        this.battle.damage(formula, this.battle, actor, action.target);
                        
                        const damage = this.battle.damageLog[0];
                        await this.updateBattleLog(`${actor.name} attacked ${action.target.name} for ${-damage} damage!`);
                        if (damage > formula) 
                            await this.updateBattleLog("IT HIT RIGHT IN THE HEART!");
                        else if (damage === 0) 
                            await this.updateBattleLog(`${actor.name}'s attack whiffed!`);
        
                        break;
                    } 
                    case "✨ SKILL": {
                        if (!(action.actionObject instanceof Skill)) return;
        
                        const skillIndex = actor.skills.findIndex(skill => skill.name === action.actionObject?.name);
                        actor.useSkill(skillIndex, action.target, this.battle, action.actionObject.properties?.attackType);
        
                        const damage = this.battle.damageLog[0];
                        await this.updateBattleLog(`${actor.name} used ${action.actionObject.name}!`);
        
                        if (damage > 0)
                            await this.updateBattleLog(`${action.target.name} recovered ${damage} HP!`);
                        else if (damage === 0) 
                            await this.updateBattleLog(`${actor.name}'s attack whiffed!`);
                        else
                            await this.updateBattleLog(`${action.target.name} took ${-damage} damage!`);
        
                        break;
                    }
                    case "🍬 SNACK":
                    case "🎉 TOY": {
                        if (!(action.actionObject instanceof Item)) return;
        
                        const hp = action.actionObject.properties.hpHeal;
                        const juice = action.actionObject.properties.juiceHeal;
        
                        this.battle.inventory.useItem(action.actionObject, action.target);
        
                        await this.updateBattleLog(`**${actor.name} used ${action.actionObject.name}!**`);
        
                        if (hp > 0)
                            await this.updateBattleLog(`${action.target.name} recovered ${hp} HP!`);
                        else if (hp === 0 && !action.actionObject.properties.isToy) 
                            await this.updateBattleLog(`**${actor.name}'s attack whiffed!**`);
                        else
                            await this.updateBattleLog(`${action.target.name} took ${-hp} damage!`);
                        
                        if (juice > 0)
                            await this.updateBattleLog(`${action.target.name} recovered ${juice} JUICE!`);
        
                        action.actionObject.properties?.states?.forEach(async state => {
                            await this.updateBattleLog(`${action.target.name} is now ${state.name}!`);
                        })
        
                        break;
                    }
                }

                if (this.battle.battleEndStatus === Battle.Victory) return await this.winBattle();
            }
        }

        yield await this.newTurn();
    }
    
    async newTurn() {
        this.currentPartyMemberIndex = 0;
        this.battle.turn++;
        this.battleLog = [];
        this.selectedActions = [];

        for (const actor of [...this.battle.alivePartyMembers, ...this.battle.aliveEnemies]) {
            for (const state of actor.affectedStates) {
                state.turnCounter++;
                if (state.properties?.turns && state.turnCounter >= state.properties?.turns) actor.removeState(state);
            }
        }

        await this.updateBattleUI();
        await this.listenforMenuOption();
    }

    async winBattle() {
        const userId = this.interaction.user.id;

        userData.increaseTimesBeaten(userId);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Victory!")
            .setDescription("All enemies were defeated!")
            .addFields({ name: "Battle Stats: ", value: this.getBattleStats()});

        await this.battleUI.edit({ embeds: [embed], components: []});

        delete activeBattles[userId];
    }

    async loseBattle() {
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("GAME OVER!")
            .setDescription("Would you like to try again?")
            .setImage("https://cdn.discordapp.com/attachments/1091901889257410573/1118242686135193652/gameover.webp")
            .setTimestamp()

        const yesButton = new ButtonBuilder()
            .setCustomId("YES")
            .setLabel("YES")
            .setStyle(ButtonStyle.Success)

        const noButton = new ButtonBuilder()
            .setCustomId("NO")
            .setLabel("NO")
            .setStyle(ButtonStyle.Danger)

        const row = new ActionRowBuilder()
            .addComponents(yesButton, noButton);

        this.battleUI.edit({ embeds: [embed], components: [row] });

        const choice = await this.battleUI.awaitMessageComponent({ filter: userFilter, time: 800000 });
        await choice.deferUpdate();

        if (choice.customId === "YES") {
            const resetInstance = await createBattleInstance(this.interaction, this.battle.allEnemies[0]);
            await resetInstance.listenforMenuOption();
        } else {
            const statsEmbed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle("Welp. Better luck next time!")
                .addFields({ name: "Battle Stats: ", value: this.getBattleStats()})

            this.battleUI.edit({ embeds: [statsEmbed], components: []});
            
            delete activeBattles[this.interaction.user.id];
        }
    }

    getBattleStats() {
        return `Elapsed Time: ${this.getElapsedTime()}
        Turns Lasted: ${this.battle.turn - 1}
        Highest Damage Dealt: ${-Math.min(...this.battle.damageLog.filter(d => d < 0))}
        Lowest Damage Dealt: ${-Math.max(...this.battle.damageLog.filter(d => d < 0))}
        Total Enemies Killed: ${this.battle.allEnemies.length - this.battle.aliveEnemies.length}
        Total Party Member Deaths: ${this.battle.deathCount}
        Total Attempts: ${userData.getUserData(this.interaction.user.id).attempts}
        `;
    }
}

