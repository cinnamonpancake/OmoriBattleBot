import fs from "fs";
import path from "path";
import userDataJSON from "./userdata.json";

const jsonPath = path.join(__dirname, "userdata.json");

class UserDataTemplate {
    timesBeaten: number = 0;
    attempts: number = 0;
}

export function createUserData(userId: string) {
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    json[userId] = new UserDataTemplate();

    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
}

export function userDataExists(userId: string) {
    return typeof userDataJSON[userId as keyof typeof userDataJSON] !== "undefined";
}

export function getUserData(userId: string): UserDataTemplate {
    if (!userDataExists(userId)) createUserData(userId);
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8"))[userId];
}

export function increaseTimesBeaten(userId: string) {
    if (!userDataExists(userId)) createUserData(userId);

    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    json[userId].timesBeaten++;
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
}

export function increaseAttempts(userId: string) {
    if (!userDataExists(userId)) createUserData(userId);

    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    json[userId].attempts++;
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
}