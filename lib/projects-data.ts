export type ProjectType = "game" | "component" | "experiment" | "tool" | "design"

export interface Project {
  id: string
  title: string
  description: string
  type: ProjectType
  tags: string[]
  year: string
  link?: string
  isExternal?: boolean
}

export interface Folder {
  id: string
  name: string
  icon: ProjectType
  description: string
  projects: Project[]
}

export const folders: Folder[] = [
  {
    id: "components",
    name: "组件库",
    icon: "component",
    description: "可复用的 UI 组件集合",
    projects: [
      {
        id: "calendar",
        title: "日历",
        description: "可以编辑和拖拽的日历组件",
        type: "component",
        tags: ["日历", "拖拽"],
        year: "2026",
        link: "/components/calendar",
      },
      {
        id: "data-table",
        title: "数据表格",
        description: "高性能虚拟滚动表格，支持排序和筛选",
        type: "component",
        tags: ["虚拟化", "TypeScript", "可访问性"],
        year: "2024",
      },
      {
        id: "color-picker",
        title: "色彩选择器",
        description: "支持多种色彩空间的专业取色工具",
        type: "component",
        tags: ["Canvas", "色彩理论", "HSL"],
        year: "2023",
      },
    ],
  },
  {
    id: "games",
    name: "游戏 Demo",
    icon: "game",
    description: "互动游戏原型与实验",
    projects: [
      {
        id: "pixel-adventure",
        title: "像素冒险",
        description: "一个复古风格的平台跳跃游戏原型，支持触控操作",
        type: "game",
        tags: ["Canvas", "TypeScript", "像素风"],
        year: "2024",
        link: "/games/pixel-adventure",
      },
      {
        id: "card-battle",
        title: "卡牌对决",
        description: "回合制卡牌战斗系统，支持卡组构建",
        type: "game",
        tags: ["React", "状态机", "动画"],
        year: "2024",
        link: "/games/card-battle",
      },
      {
        id: "puzzle-box",
        title: "解谜盒子",
        description: "物理引擎驱动的 3D 解谜游戏",
        type: "game",
        tags: ["Three.js", "物理引擎", "WebGL"],
        year: "2023",
        link: "/games/puzzle-box",
      },
      {
        id: "color-blocks",
        title: "五色暗码",
        description: "底部隐藏五色密码，上方摆放猜测，仅提示有几个位置完全正确",
        type: "game",
        tags: ["推理", "颜色", "React"],
        year: "2026",
        link: "/games/color-blocks",
      },
    ],
  },
  {
    id: "experiments",
    name: "实验场",
    icon: "experiment",
    description: "疯狂的想法与技术探索",
    projects: [
      {
        id: "art-gallery",
        title: "画廊",
        description: "艺术作品展示",
        type: "experiment",
        tags: ["艺术"],
        year: "2024",
      },
      {
        id: "shader-playground",
        title: "着色器乐园",
        description: "WebGL 着色器效果实验与可视化编辑器",
        type: "experiment",
        tags: ["GLSL", "WebGL", "可视化"],
        year: "2024",
      },
      {
        id: "audio-viz",
        title: "音频可视化",
        description: "实时音频频谱分析与创意可视化",
        type: "experiment",
        tags: ["Web Audio", "Canvas", "实时"],
        year: "2023",
      },
    ],
  },
  {
    id: "tools",
    name: "小工具",
    icon: "tool",
    description: "提升效率的实用工具",
    projects: [
      {
        id: "markdown-editor",
        title: "Markdown 编辑器",
        description: "支持实时预览的极简写作工具",
        type: "tool",
        tags: ["编辑器", "Markdown", "实时预览"],
        year: "2024",
      },
      {
        id: "image-compressor",
        title: "图片压缩器",
        description: "浏览器端图片压缩，保护隐私",
        type: "tool",
        tags: ["WebAssembly", "隐私", "离线"],
        year: "2023",
      },
    ],
  },
  {
    id: "designs",
    name: "设计稿",
    icon: "design",
    description: "界面设计与视觉探索",
    projects: [
      {
        id: "design-system",
        title: "设计系统",
        description: "完整的组件设计规范与色彩系统",
        type: "design",
        tags: ["设计系统", "Figma", "规范"],
        year: "2024",
      },
      {
        id: "app-concept",
        title: "App 概念设计",
        description: "移动应用界面设计探索",
        type: "design",
        tags: ["UI/UX", "移动端", "原型"],
        year: "2024",
      },
    ],
  },
]

export const getTypeColor = (type: ProjectType): string => {
  const colors: Record<ProjectType, string> = {
    game: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    component: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    experiment: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    tool: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    design: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  }
  return colors[type]
}

export const getTypeLabel = (type: ProjectType): string => {
  const labels: Record<ProjectType, string> = {
    game: "游戏",
    component: "组件",
    experiment: "实验",
    tool: "工具",
    design: "设计",
  }
  return labels[type]
}
