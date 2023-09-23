//
// States & Emotions
//

import { State, PartyMember, Enemy, EmoDamageRate } from "./battle_data";


export interface StatMultiplier { 
    maxHp?: number;
    attack?: number;
    maxJuice?: number;
    speed?: number;
    defense?: number;
    luck?: number;
    hitRate?: number;
}

export const emotionNames = [
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
    let stateNames: any[] = [];
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