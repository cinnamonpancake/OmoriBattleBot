import { PartyMember, Enemy, Skill } from "./battle_data";

export function initOmoriSkills(OMORI: PartyMember) {
    OMORI.addSkill(OMORI.stats.speed * 3, 45, "VERTIGO", "Deals damage to all foes based on user's SPEED and greatly reduces their ATTACK.\nCosts 45 JUICE.");
    OMORI.addSkill(OMORI.stats.attack * 3.5, 45, "CRIPPLE", "Deals big damage to all foes and greatly reduces their SPEED.\nCosts 45 JUICE.");
    OMORI.addSkill(OMORI.stats.attack * 3, 75, "RED HANDS", "Deals big damage 4 times. Costs 75 JUICE.");
    OMORI.addSkill(400, 45, "SUFFOCATE", "Deals 400 damage to all foes and greatly reduces their DEFENSE. Costs 45 JUICE.");
}

export function initAubreySkills(AUBREY: PartyMember) {
    AUBREY.addSkill(AUBREY.stats.attack * 2, 20, "WIND-UP THROW", "Damages all foes. Deals more damage the less enemies there are.");
    AUBREY.addSkill(AUBREY.stats.attack * 2, 20, "POWER HIT", "An attack that ignores a foe's DEFENSE, then reduces the foe's DEFENSE by one tier.");
    AUBREY.addSkill(AUBREY.stats.attack * 2, 30, "BEATDOWN", "Attacks a foe 3 times.");
    AUBREY.addSkill(AUBREY.hp * 4, 50, "LAST RESORT", "Deals damage based on AUBREY's HEART, but AUBREY becomes TOAST.");
}

export function initKelSkills(KEL: PartyMember) {
    KEL.addSkill(0, 45, "FLEX", "Deals damage to all foes based on user's SPEED and greatly reduces their ATTACK.\nCosts 45 JUICE.");
    KEL.addSkill(KEL.stats.speed * 1.5, 45, "RUN N' GUN ", "KEL does an attack based on his SPEED instead of his ATTACK.");
    KEL.addSkill(0, 75, "CAN'T CATCH ME", "Attracts attention and reduces all foes' HIT RATE by 55% for two turns.");
    KEL.addSkill(0, 45, "LAST RESORT", "All attacks on a foe will hit right in the HEART next turn.");
}

export function initHeroSkills(HERO: PartyMember) {
    HERO.addSkill(HERO.stats.speed * 2, 45, "TENDERIZE", "Deals big damage to a foe and reduces their DEFENSE.");
    HERO.addSkill(HERO.stats.attack * 2, 45, "GATOR AID", "Boosts all friends' DEFENSE.");
    HERO.addSkill(HERO.stats.attack * 2, 75, "MESMERIZE", "Acts first. All foes target HERO for 1 turn. HERO takes less damage by 50%.");
    HERO.addSkill(HERO.hp * 4, 45, "DAZZLE", "Acts first. Reduces all foes' ATTACK and makes them HAPPY.");
}

export function getSkillByName(target: PartyMember | Enemy, skillQuery: string) {
    return target.skills.find(skill => skill.name === skillQuery);
}
