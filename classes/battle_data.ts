import { Battle } from "./battler";

export class BattleMember {
    constructor(name: string, stats: StatBuilder, thirdStageEmotions?: boolean) {
        this.name = name;
        this.stats = stats;
        this.hp = this.stats.maxHp;
        this.juice = this.stats.maxJuice;
        this.thirdStageEmotions = thirdStageEmotions ?? false;
    }

    name: string;
    skills: Skill[] = [];
    stats: StatBuilder;
    hp: number;
    juice: number;
    thirdStageEmotions: boolean = false;
    affectedStates: State[] = [];
}

export class PartyMember extends BattleMember {
    constructor(level: number, name: string, thirdStageEmotions?: boolean) {
        const stats: StatBuilder = {
            maxHp: level * (Math.round(Math.random() * 7) + 5),
            attack: level * 2,
            speed: level * (Math.round(Math.random() * 7) + 5),
            defense: level * 1.2,
            luck: level / 2.5,
            maxJuice: level * 1.8,
            hitRate: 100
        }
        super(name, stats, thirdStageEmotions);
        this.level = level;
        this.name = name;
        this.stats = {
            maxHp: level * (Math.round(Math.random() * 7) + 5),
            attack: level * 2,
            speed: level * (Math.round(Math.random() * 7) + 5),
            defense: level * 1.2,
            luck: level / 2.5,
            maxJuice: level * 1.8,
            hitRate: 100
        }
        this.hp = this.stats.maxHp;
        this.juice = this.stats.maxJuice;
    }

    useSkill(skillIndex: number, target: PartyMember | Enemy, battle: Battle, attackType?: string) {
        const skill = this.skills[skillIndex];
        if (!skill) return;

        let damage = skill.properties?.ignoreDefense ? skill.damageFormula : skill.damageFormula  - target.stats.defense;

        if (this.juice) {
            if (this.juice >= skill.juiceCost) this.juice -= skill.juiceCost;
            else return;
        }
        battle.damage(damage, battle, this, target, attackType);
    }

    addSkill(damageFormula: number, juiceCost: number, name: string, description: string, properties?: SkillProperties) {
        if (this.skills.length >= 4) return;

        if (properties) {
            if (properties.states) {
                for (const state of properties.states) {
                    this.addState(state);
                }
            }
        }
        const newSkill = new Skill(damageFormula, juiceCost, name, description, properties);
        this.skills.push(newSkill);
    }

    addState(state: State) {
        switch (state.name) {
            case "HAPPY":
                if (this.isStateAffected("HAPPY")) state = BaseStates.ECSTATIC;
                else if (this.isStateAffected("ECSTATIC") && this.thirdStageEmotions) state = BaseStates.MANIC;
                else if (this.isStateAffected("MANIC")) return;
                break;
            case "ANGRY":
                if (this.isStateAffected("ANGRY")) state = BaseStates.ENRAGED;
                else if (this.isStateAffected("ENRAGED") && this.thirdStageEmotions) state = BaseStates.FURIOUS;
                else if (this.isStateAffected("FURIOUS")) return;
                break;
            case "SAD":
                if (this.isStateAffected("SAD")) state = BaseStates.DEPRESSED;
                else if (this.isStateAffected("DEPRESSED") && this.thirdStageEmotions) state = BaseStates.MISERABLE;
                else if (this.isStateAffected("MISERABLE")) return;
                break;
        }

        for (const statKey in this.stats) {
            const currentStat = statKey as keyof typeof this.stats;
            const newStat = statKey as keyof typeof state.multipliers;
            statKey !== "hitRate" ? this.stats[currentStat] *= state.multipliers[newStat] ?? 1 : this.stats[currentStat] += state.multipliers[newStat] ?? 0;
        }

        if (state.properties?.removeOnApply) {
            for (const stateToRemove of state.properties?.removeOnApply) {
                this.removeState(BaseStates.getStatesByName(this, stateToRemove)[0]);
            }
        }

        this.affectedStates.push(state);
    }

    removeState(state: State) {
        const searchedState = this.affectedStates.find(affectedState => affectedState === state);
        if (!searchedState) return;

        for (const statKey in this.stats) {
            const currentStat = statKey as keyof typeof this.stats;
            const newStat = statKey as keyof typeof state.multipliers;
            statKey !== "hitRate" ? this.stats[currentStat] /= state.multipliers[newStat] ?? 1 : this.stats[currentStat] -= state.multipliers[newStat] ?? 0;
        }
        this.affectedStates = this.affectedStates.filter(affectedState => affectedState !== state);
    }

    isStateAffected(stateName: string) {
        return typeof this.affectedStates.find(state => state.name === stateName) !== "undefined";
    }

    level: number;
    name: string;
    skills: Skill[] = [];
    stats: StatBuilder;
    hp: number;
    armor?: Armor;
    weapon?: Weapon;
    juice: number;
    thirdStageEmotions: boolean = false;
    affectedStates: State[] = [];
}

export class Enemy extends BattleMember {
    constructor(stats: StatBuilder,  name: string, battleImage?: string, thirdStageEmotions?: boolean) {
        super(name, stats, thirdStageEmotions);
        this.name = name;
        this.stats = stats;
        this.hp = this.stats.maxHp;
        this.battleImage = battleImage;
    }

    name: string;
    stats: StatBuilder;
    hp: number;
    skills: Skill[] = [];
    thirdStageEmotions: boolean = false;
    battleImage?: string;
    affectedStates: State[] = [];

    addSkill(damageFormula: number, juiceCost: number, name: string, description: string) {
        if (this.skills.length >= 4) return;

        const newSkill = new Skill(damageFormula, juiceCost, name, description);
        this.skills.push(newSkill);
        return newSkill;
    }

    useSkill(skillIndex: number, target: PartyMember | Enemy, battle: Battle, attackType?: string) {
        const skill = this.skills[skillIndex];
        if (!skill) return;

        let damage = skill.properties ? skill.damageFormula - target.stats.defense : skill.damageFormula;
        battle.damage(damage, battle, target, this, attackType);
    }

    isStateAffected(stateName: string) {
        return typeof this.affectedStates.find(state => state.name === stateName) !== "undefined";
    }

    addState(state: State) {
        console.log(state.name)
        switch (state.name) {
            case "HAPPY":
                if (this.isStateAffected("HAPPY")) state = BaseStates.ECSTATIC;
                else if (this.isStateAffected("ECSTATIC") && this.thirdStageEmotions) state = BaseStates.MANIC;
                else if (this.isStateAffected("MANIC")) return;
                break;
            case "ANGRY":
                if (this.isStateAffected("ANGRY")) state = BaseStates.ENRAGED;
                else if (this.isStateAffected("ENRAGED") && this.thirdStageEmotions) state = BaseStates.FURIOUS;
                else if (this.isStateAffected("FURIOUS")) return;
                break;
            case "SAD":
                if (this.isStateAffected("SAD")) state = BaseStates.DEPRESSED;
                else if (this.isStateAffected("DEPRESSED") && this.thirdStageEmotions) state = BaseStates.MISERABLE;
                else if (this.isStateAffected("MISERABLE")) return;
                break;
        }

        for (const statKey in this.stats) {
            const currentStat = statKey as keyof typeof this.stats;
            const newStat = statKey as keyof typeof state.multipliers;
            statKey !== "hitRate" ? this.stats[currentStat] *= state.multipliers[newStat] ?? 1 : this.stats[currentStat] += state.multipliers[newStat] ?? 0;
        }
        
        if (state.properties?.removeOnApply) {
            for (const stateToRemove of state.properties?.removeOnApply) {
                this.removeState(BaseStates.getStatesByName(this, stateToRemove)[0]);
            }
        }
        
        this.affectedStates.push(state);
    }

    removeState(state: State) {
        const searchedState = this.affectedStates.find(affectedState => affectedState === state);
        if (!searchedState) return;

        for (const statKey in this.stats) {
            const currentStat = statKey as keyof typeof this.stats;
            const newStat = statKey as keyof typeof state.multipliers;
            statKey !== "hitRate" ? this.stats[currentStat] /= state.multipliers[newStat] ?? 1 : this.stats[currentStat] -= state.multipliers[newStat] ?? 0;
        }
        this.affectedStates = this.affectedStates.filter(affectedState => affectedState !== state);
    }
}

export class Item {
    constructor(name: string, description: string, properties: ItemProperties) {
        this.name = name;
        this.description = description;
        this.properties = properties;
    }

    name: string;
    description: string;
    properties: ItemProperties;
}

export interface ItemProperties {
    hpHeal: number;
    juiceHeal: number;
    isToy?: boolean;
    target?: string;
    states?: State[];
}

export class Skill {
    constructor(damageFormula: number, juiceCost: number, name: string, description: string, properties?: SkillProperties) {
        this.damageFormula = damageFormula;
        this.name = name;
        this.juiceCost = juiceCost;
        this.description = description;
        this.properties = properties;
    }

    damageFormula: number;
    juiceCost: number;
    properties?: SkillProperties;
    name: string;
    description: string;
}

export interface SkillProperties {
    ignoreDefense?: boolean;
    attackType?: string;
    states?: State[];
}

export class Weapon {
    constructor(stats: StatBuilder, name: string, description: string) {
        this.stats = stats;
        this.name = name;
        this.description = description;
    }

    stats: StatBuilder;
    name: string;
    description: string;

    equip(wielder: PartyMember) {
        if (wielder.weapon) {
            wielder.stats.maxHp -= wielder.weapon.stats.maxHp;
            wielder.stats.defense -= wielder.weapon.stats.defense;
            wielder.stats.maxJuice -= wielder.weapon.stats.maxJuice;
            wielder.stats.speed -= wielder.weapon.stats.speed;
            wielder.stats.attack -= wielder.weapon.stats.attack;
            wielder.stats.luck -= wielder.weapon.stats.luck;
        }
        wielder.weapon = this;
        wielder.stats.maxHp += this.stats.maxHp
        wielder.stats.defense += this.stats.defense;
        wielder.stats.maxJuice += this.stats.maxJuice;
        wielder.stats.speed += this.stats.speed;
        wielder.stats.attack += this.stats.speed;
        wielder.stats.luck += this.stats.luck;
        wielder.stats.hitRate = this.stats.hitRate;
    }
}

export class Armor {
    constructor(stats: StatBuilder, name: string, description: string) {
        this.stats = stats;
        this.name = name;
        this.description = description;
    }

    stats: StatBuilder;
    name: string;
    description: string;

    equip(wearer: PartyMember) {
        if (wearer.armor) {
            wearer.stats.maxHp -= wearer.armor.stats.maxHp;
            wearer.stats.defense -= wearer.armor.stats.defense;
            wearer.stats.maxJuice -= wearer.armor.stats.maxJuice;
            wearer.stats.speed -= wearer.armor.stats.speed;
            wearer.stats.attack -= wearer.armor.stats.attack;
            wearer.stats.luck -= wearer.armor.stats.luck;
        }
        wearer.armor = this;
        wearer.stats.maxHp += this.stats.maxHp
        wearer.stats.defense += this.stats.defense;
        wearer.stats.maxJuice += this.stats.maxJuice;
        wearer.stats.speed += this.stats.speed;
        wearer.stats.attack += this.stats.speed;
        wearer.stats.luck += this.stats.luck;
        wearer.stats.hitRate = this.stats.hitRate;
    }
}

export class State {
    constructor(name: string, multipliers: StatMultiplier, properties?: StateProperties) {
        this.name = name;
        this.multipliers = multipliers;
        this.properties = properties;
    }

    name: string;
    properties?: StateProperties;
    turnCounter: number = 0;
    multipliers: StatMultiplier;
    applyEmotionMultipliers(damage: number, target: PartyMember | Enemy) {
        if (this.properties?.emotionRate) {
            if (this.properties.emotionRate.ALL && BaseStates.getEmotionName(target) !== "NEUTRAL") {
                damage *= this.properties.emotionRate.ALL;
                return;
            }
            const keys = Object.keys(this.properties.emotionRate);
            const values = Object.values(this.properties.emotionRate);
            const emotionName = BaseStates.getEmotionName(target);
            if (keys.includes(emotionName)) {
                damage *= values[keys.indexOf(emotionName)];
            }
        }
    }
}

export interface StateProperties {
    turns?: number;
    removeOnDamage?: boolean;
    removeOnApply?: string[];
    emotionRate?: EmoDamageRate;
}

export interface EmoDamageRate {
    ALL?: number;
    HAPPY?: number;
    ECSTATIC?: number;
    MANIC?: number;
    SAD?: number;
    DEPRESSED?: number;
    MISERABLE?: number;
    ANGRY?: number;
    ENRAGED?: number;
    FURIOUS?: number;
}

export interface StatBuilder { 
    // Stores all stats except current HP and juice. 
    // only to be used directly in the constructor for enemies, party member StatBuilder is decided by level
    maxHp: number;
    attack: number;
    maxJuice: number;
    speed: number;
    defense: number;
    luck: number
    hitRate: number;
}

export interface StatMultiplier { 
    maxHp?: number;
    attack?: number;
    maxJuice?: number;
    speed?: number;
    defense?: number;
    luck?: number;
    hitRate?: number;
}

export namespace BaseStates {
    
    export const emotionNames: string[] = [
        "HAPPY",
        "ECSTATIC",
        "MANIC",
        "ANGRY",
        "ENRAGED",
        "FURIOUS",
        "SAD",
        "DEPRESSED",
        "MISERABLE",
        "AFRAID",
        "STRESSED OUT"
    ];
    
    // emotion damage rates
    
    export const happyEmotionRate: EmoDamageRate = {
        ANGRY: 1.5,
        ENRAGED: 2,
        FURIOUS: 2.5
    }
    export const angryEmotionRate: EmoDamageRate = {
        SAD: 1.5,
        DEPRESSED: 2,
        MISERABLE: 2.5
    }
    export const sadEmotionRate: EmoDamageRate = {
        HAPPY: 1.5,
        ECSTATIC: 2,
        MANIC: 2.5
    }
    
    // emotions
    
    export const HAPPY = new State("HAPPY", {
        luck: 2,
        speed: 1.25,
        hitRate: -10
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "HAPPY")],
        emotionRate: happyEmotionRate
    })
    
    export const ECSTATIC = new State("ECSTATIC", {
        luck: 3,
        speed: 1.25,
        hitRate: -20
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "ECSTATIC")],
        emotionRate: happyEmotionRate
    })
    
    export const MANIC = new State("MANIC", {
        luck: 4,
        speed: 2,
        hitRate: -30
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "MANIC")],
        emotionRate: happyEmotionRate
    })
    
    export const ANGRY = new State("ANGRY", {
        attack: 1.3,
        defense: 0.5
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "ANGRY")],
        emotionRate: happyEmotionRate
    })
    
    export const ENRAGED = new State("ENRAGED", {
        attack: 1.5,
        defense: 0.3
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "ENRAGED")],
        emotionRate: happyEmotionRate
    })
    
    export const FURIOUS = new State("FURIOUS", {
        attack: 2,
        defense: 0.15
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "FURIOUS")],
        emotionRate: happyEmotionRate
    })
    
    export const SAD = new State("SAD", {
        defense: 1.25,
        speed: 0.8
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "SAD")],
        emotionRate: happyEmotionRate
    })
    
    export const DEPRESSED = new State("DEPRESSED", {
        defense: 1.35,
        speed: 0.65
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "DEPRESSED")],
        emotionRate: happyEmotionRate
    })
    
    export const MISERABLE = new State("MISERABLE", {
        defense: 1.5,
        speed: 0.5
    }, {
        removeOnApply: [...emotionNames.filter(emName => emName !== "MISERABLE")],
        emotionRate: happyEmotionRate
    })
    
    // functions
    
    export function getEmotionName(target: PartyMember | Enemy) {
        return target.hp <= 0 ? "TOAST" : target.affectedStates.find(state => emotionNames.includes(state.name))?.name ?? "NEUTRAL";
    }
    
    export function getEmotionState(target: PartyMember | Enemy) {
        return target.affectedStates.find(state => emotionNames.includes(state.name));
    }
    
    export function getStatesByName(target: PartyMember | Enemy, ...stateQueries: string[]) {
        let stateNames: State[] = [];
        for (const stateQuery of stateQueries) {
            const filteredStates = target.affectedStates.filter(state => state.name === stateQuery);
            if (filteredStates.length < 1) {
                stateNames = stateNames.concat(filteredStates);
            } 
        }
        return stateNames;
    }
    
    export function isSad(target: PartyMember | Enemy) {
        return getStatesByName(target, "SAD", "DEPRESSED", "MISERABLE").length > 0;
    }
}
