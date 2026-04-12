/**
 * 开发时校验：npx tsx components/games/dual-tone-push/verify-levels-script.ts
 */
import { BUILTIN_DUAL_TONE_LEVELS } from "./builtin-levels"
import { parseDualToneLevel } from "./parse"
import { isParsedLevelSolvable } from "./solver"

function main() {
  let ok = true
  for (const lv of BUILTIN_DUAL_TONE_LEVELS) {
    const parsed = parseDualToneLevel(lv.map)
    const solvable = isParsedLevelSolvable(parsed)
    console.log(`${lv.id} ${lv.name}: ${solvable ? "OK" : "FAIL"}`)
    if (!solvable) ok = false
  }
  if (!ok) process.exit(1)
}

main()
