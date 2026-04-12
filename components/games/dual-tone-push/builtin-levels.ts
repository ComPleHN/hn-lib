import type { DualToneLevelDef } from "./types"

/**
 * 每关为 9×9 可移动区（无界面边框格）。
 * 难度 01→05 递增；若改地图请运行 `npx tsx components/games/dual-tone-push/verify-levels-script.ts` 确认可通关。
 */

export const BUILTIN_DUAL_TONE_LEVELS: DualToneLevelDef[] = [
  {
    id: "custom-01",
    name: "第一关",
    map: `
.........
.........
.........
.........
Q###O###H
.........
.........
.........
.........
`.trim(),
  },
  {
    id: "custom-02",
    name: "第二关",
    description: "同色地块相当于地面。异色相当于墙",
    map: `
.........
.........
.........
...##....
.#O##....
.Q###.G#.
.#######.
.....###.
.........
`.trim(),
  },
  {
    id: "custom-03",
    name: "第三关",
    description: "踩转化格后，下一次落地会变为该格颜色，用于踏上异色地面。",
    map: `
.........
#########
....#####
###.#####
Q#C.C#OG#
###.#####
....#####
#########
.........
`.trim(),
  },
  {
    id: "custom-04",
    name: "第四关",
    description: "终点与本体不在同一竖线：先横移再推。",
    map: `
.........
......#..
.....###.
.....#O##
..P.C####
..G.#####
#...#####
##.######
#########
`.trim(),
  }
]
