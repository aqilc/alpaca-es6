import { readFileSync, writeFileSync } from "fs";
let pog = JSON.parse(readFileSync("./package.json"));
if(process.argv[2] === "major")
    pog.version = pog.version.slice(0, 2) + (Number(pog.version.slice(2)) + 1);
else if(!process.argv[2] || process.argv[2] === "minor") {
    let yes = pog.version.lastIndexOf(".") + 1;
    pog.version = pog.version.slice(0, yes) + (Number(pog.version.slice(yes)) + 1);
} else pog.version = process.argv[2];
console.log("New version: ", pog.version);
writeFileSync("./package.json", JSON.stringify(pog, null, 4),"utf8");