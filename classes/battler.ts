import { BattleInstance } from "../battlesystem/battle_system";
import { PartyMember, Enemy, Skill, Item, EmoDamageRate, ItemProperties, BaseStates } from "./battle_data";

export class Battle {
    constructor(partyMembers: PartyMember[], enemies: Enemy[]) {
        this.allPartyMembers = partyMembers;
        this.alivePartyMembers = partyMembers;
        this.allEnemies = enemies;
        this.aliveEnemies = enemies;
        this.inventory = new Inventory(this);
    }

    allPartyMembers: PartyMember[];
    static battle: Battle;
    turn: number = 1;
    battleHistory: Battle[] = [];
    damageLog: number[] = [];
    inventory: Inventory;
    allEnemies: Enemy[];
    alivePartyMembers: PartyMember[];
    aliveEnemies: Enemy[];
    deathCount: number = 0;
    battleEndStatus: number = 0;

    static Victory: number = 1;
    static Loss: number = 2;
        
    changeHp(amount: number, target: PartyMember | Enemy) {
        const emotionName = BaseStates.getEmotionName(target);
        if (amount < 1 && target instanceof PartyMember && target.juice > 0 && BaseStates.isSad(target)) {
            let juiceConvertee = 0;
            switch (emotionName) {
                case "SAD":
                    juiceConvertee = -(30 / amount) * 100;
                    break;
                case "DEPRESSED":
                    juiceConvertee = -(50 / amount) * 100;
                    break;
                case "MISERABLE":
                    juiceConvertee = -amount;
                    break;
            }
            const juiceResult = target.juice - juiceConvertee;
            if (juiceResult < 0) juiceConvertee += juiceResult;
            amount += juiceConvertee;
            this.changeJuice(juiceConvertee, target);
        }

        target.hp += amount;

        if (target.hp > target.stats.maxHp) { 
            target.hp = target.stats.maxHp; 
            amount = target.hp;
        }

        this.damageLog.unshift(amount);
    
        if (target.hp <= 0) {
            if (target instanceof PartyMember) this.killPartyMember(target);
            else this.killEnemy(target);
        } 
    }

    changeJuice(amount: number, target: PartyMember) {
        target.juice += amount;
        if (target.juice > target.stats.maxJuice) { 
            target.juice = target.stats.maxJuice; 
            amount = target.juice;
        }
        this.damageLog.unshift(amount);
    }

    damage(amount: number, battle: Battle, user: PartyMember | Enemy, target: PartyMember | Enemy, attackType?: string) {
        amount = -amount;

        if (BaseStates.getEmotionName(user) !== "NEUTRAL" && BaseStates.getEmotionName(target) !== "NEUTRAL") {
            BaseStates.getEmotionState(user)?.applyEmotionMultipliers(amount, target);
        }

        const crit = Math.random() * 100 < user.stats.luck;
        const miss = Math.random() * 100 > user.stats.hitRate;

        if (crit) amount *= 2;
        if (miss) amount = 0;
        
        switch (attackType) {
            case "all": {
                if (user instanceof PartyMember) {
                    for (const member of battle.alivePartyMembers) {
                        this.changeHp(amount, member);
                    }
                } else {
                    for (const member of battle.aliveEnemies) {
                        this.changeHp(amount, member);
                    }
                }
                break;
            }    
            case "two": {
                let allTargets: PartyMember[] | Enemy[] = user instanceof PartyMember ? battle.alivePartyMembers : battle.aliveEnemies;
                for (let i = 0; i < 2; i++) {
                    this.changeHp(amount, allTargets[Math.floor(Math.random() * battle.alivePartyMembers.length)]);
                }
                break;
            }
            case "three": {
                let allTargets: PartyMember[] | Enemy[] = user instanceof PartyMember ? battle.alivePartyMembers : battle.aliveEnemies;
                for (let i = 0; i < 3; i++) {
                    this.changeHp(amount, allTargets[Math.floor(Math.random() * battle.alivePartyMembers.length)]);
                }
                break;
            }
            default:
                this.changeHp(amount, target);
                break;
        }
    }
    
    killPartyMember(target: PartyMember) {
        this.deathCount++;
        target.hp = 0;
        this.alivePartyMembers = this.alivePartyMembers.filter(member => member !== target);
        if (this.alivePartyMembers.length < 1) this.battleEndStatus = Battle.Loss;
    }

    killEnemy(target: Enemy) {
        this.aliveEnemies = this.aliveEnemies.filter(enemy => enemy !== target);
        if (this.aliveEnemies.length < 1) this.battleEndStatus = Battle.Victory;
    }
}

export class Inventory { 
    constructor(battle: Battle) {
        this.battle = battle;
    }
    snacks: Item[] = [];
    toys: Item[] = [];
    battle: Battle;

    addItem(name: string, description: string, properties: ItemProperties, amount: number) {
        const item = new Item(name, description, properties);
        
        for (let i = 0; i < amount; i++) {
            if (item.properties.isToy) this.toys.push(item);
            else this.snacks.push(item);
        }
    }

    removeItem(item: Item, amount: number = 1) {
        for (let i = 0; i < amount; i++) {
            if (!this.toys.includes(item) && !this.snacks.includes(item)) return;
            item.properties.isToy ? this.toys.splice(this.toys.indexOf(item), amount) : this.snacks.splice(this.snacks.indexOf(item), amount);
        }
    }

    useItem(item: Item, target: PartyMember | Enemy) {
        if (item.properties.hpHeal !== 0) this.battle.changeHp(item.properties.hpHeal, target);
        if (item.properties.juiceHeal !== 0 && target instanceof PartyMember) this.battle.changeJuice(item.properties.juiceHeal, target);

        if (item.properties.states) {
            for (const state of item.properties.states) {
                target.addState(state);
            }
        }
        
        this.removeItem(item, 1);
    }

    getItemsByName(itemName: string) {
        return this.snacks.filter(snack => snack.name === itemName).concat(this.toys.filter(toy => toy.name === itemName));
    }
}