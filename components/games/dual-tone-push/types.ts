/** 0 白 1 黑 */
export type Tone = 0 | 1

export type DualToneLevelDef = {
  id: string
  name: string
  description?: string
  /**
   * 9×9 字符图 = **全部**参与逻辑的可移动范围；**不含**界面装饰边框。
   * 外框由 `DualTonePushGame` 外层样式绘制，不参与碰撞与地块判定。
   */
  map: string
}

/** 单格解析结果（不含实体时无 player / box） */
export type RawTileCell = {
  floor: Tone
  goal: boolean
  converter: boolean
  player?: Tone
  box?: Tone
}

export type ParsedDualToneLevel = {
  cells: {
    floor: Tone
    goal: boolean
    converter: boolean
  }[][]
  player: { r: number; c: number; tone: Tone }
  boxes: { r: number; c: number; tone: Tone }[]
}

export type ParseDualToneOptions = {
  /** 默认 `DUAL_TONE_GRID_SIZE`，与游戏内一致时才能游玩 */
  gridSize?: number
  /**
   * 与默认字符表合并（同名键覆盖），用于扩展新地块字符而不改核心文件。
   * 例：`{ '*': { floor: 0, goal: true, converter: true } }`
   */
  tileChars?: Record<string, RawTileCell>
}
