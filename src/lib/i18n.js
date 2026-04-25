const TEXT = {
  zh: {
    common: {
      zh: "中文",
      en: "EN",
      close: "关闭",
      active: "当前",
      useThis: "使用",
      save: "保存",
      remove: "移除",
      drafts: "草稿",
      noAi: "AI 未就绪",
      sketchOn: "草图已连接",
      sketchOff: "未连接草图",
      noData: "暂无"
    },
    landing: {
      eyebrow: "实验性家具研究",
      title: "桌子生成器",
      copy: "AI 与参数化桌子定制实验",
      button: "进入"
    },
    chat: {
      title: "用文字和草图驱动桌子",
      assistant: "设计助手",
      unifiedInput: "统一输入",
      inputTitle: "文字 / 草图 / 当前参数",
      promptPlaceholder: "描述风格、尺寸、用途或轮廓",
      generate: "生成 3 个方向",
      generating: "生成中...",
      locks: "锁定项",
      locksTitle: "保留你满意的部分",
      understanding: "AI 理解",
      understandingTitle: "确认系统是否理解正确",
      understandingEmpty: "生成后这里会显示理解摘要",
      variants: "候选方案",
      variantsTitle: "先选方向，再细化",
      variantsEmpty: "生成后这里会显示三个方案",
      localEdit: "局部修改",
      localEditTitle: "只改一部分",
      scope: "范围",
      localPlaceholder: "输入你想改的局部效果",
      apply: "应用局部修改",
      applying: "应用中...",
      lockShape: "锁定形态",
      lockSize: "锁定尺寸",
      lockMaterial: "锁定材质",
      lockSurface: "锁定表面",
      lockLegs: "锁定桌腿",
      scopeOverall: "整体",
      scopeFrontEdge: "前缘",
      scopeLeft: "左侧",
      scopeCenter: "中心",
      scopeLegs: "桌腿",
      intent: "意图",
      constraints: "约束",
      sketchInfluence: "草图影响",
      nextQuestion: "下一步"
    },
    control: {
      headerEyebrow: "家具定制器",
      headerTitle: "三角模块桌子",
      triangleSystem: "三角系统",
      triangleTitle: "上传图样或草图",
      motif: "模块图样",
      motifTitle: "图样映射",
      patternSource: "图样来源",
      upload: "上传图样",
      removeMotif: "移除图样",
      patternPresence: "图样强度",
      contrast: "对比度",
      brightness: "亮度",
      relief: "起伏",
      noMotif: "未上传图样",
      motifReady: "图样已就绪",
      outline: "轮廓逻辑",
      outlineTitle: "轮廓来源",
      outlineSource: "轮廓来源",
      fallbackShape: "基础形状",
      triangleSize: "三角尺寸",
      triangleThickness: "三角厚度",
      moduleGap: "模块缝隙",
      component: "部件工作台",
      componentTitle: "按部件调整",
      pickPart: "选择部件",
      ecoMaterial: "环保材料",
      tint: "色彩",
      localModuleSize: "局部模块尺寸",
      localThickness: "局部厚度",
      legWidthScale: "桌腿宽度",
      legDepthScale: "桌腿厚度",
      legLengthScale: "桌腿高度",
      joinLogic: "连接逻辑",
      joinLogicTitle: "桌面桌腿一体化思路",
      sceneSurface: "场景与基材",
      sceneSurfaceTitle: "光环境与材质",
      lightMode: "场景",
      baseMaterial: "基础材质",
      dimensions: "整体尺寸",
      dimensionsTitle: "长宽高",
      length: "长度",
      width: "宽度",
      overallHeight: "整体高度",
      legLength: "桌腿高度",
      legSystem: "桌腿系统",
      legSystemTitle: "桌腿形态",
      legShape: "桌腿形状",
      legHeight: "桌腿高度",
      legWidth: "桌腿宽度",
      legDepth: "桌腿厚度",
      legCount: "桌腿数量",
      currentSelection: "当前方案",
      currentSelectionTitle: "当前配置",
      saveDraft: "保存到草稿",
      availableMaterials: "可选材料",
      uploaded: "已上传",
      defaultMetal: "默认金属"
    },
    drafts: {
      eyebrow: "已保存草稿",
      title: "方案对比",
      empty: "还没有草稿",
      close: "关闭"
    },
    part: {
      selected: "已选部件",
      detected: "系统识别",
      sketchpad: "局部草图",
      dialogue: "局部输入",
      placeholder: "描述这个部件要怎么改",
      clear: "清空草图",
      apply: "应用文字 / 草图",
      ecoMaterial: "环保材料",
      tint: "色彩"
    },
    join: {
      aria: "三角模块连接草图",
      surface: "01 表层皮肤",
      collar: "02 折面过渡",
      core: "03 承重核心",
      surfaceNote: "桌面应读成一整块连续三角皮肤",
      collarNote: "过渡区把桌面缝线连续带到桌腿",
      coreNote: "内部可有结构芯，外部语言保持统一"
    },
    variant: {
      clickHint: "点 B / C 放大",
      a: "A",
      b: "B",
      c: "C"
    },
    options: {
      scenario: {
        daylight: "日间",
        late_night: "夜间",
        void: "极简"
      },
      shape: {
        rectangle: "矩形",
        round: "圆形",
        oval: "椭圆"
      },
      silhouette: {
        shape: "预设轮廓",
        sketch: "草图轮廓"
      },
      pattern: {
        metal: "金属模块",
        uploaded: "上传图样"
      },
      legShape: {
        round: "圆腿",
        square: "方腿",
        blade: "片腿"
      },
      material: {
        light_wood: "浅木",
        dark_walnut: "胡桃木",
        rough_stone: "粗石",
        metal: "金属"
      }
    },
    status: {
      start: "先输入一句话，可选画草图，再生成 3 个方向",
      draftSaved: "草稿已保存：{label}",
      draftRestored: "已恢复草稿：{label}",
      motifPreparing: "正在处理上传图样...",
      motifLinked: "图样已连接：{name}",
      motifRemoved: "已移除图样",
      needBrief: "先输入需求或添加草图",
      generating: "正在生成 3 个方向...",
      localDirections: "AI 离线，已生成本地方案",
      directionsReady: "3 个方向已生成",
      needLocalEdit: "先输入局部修改内容",
      localApplying: "正在应用局部修改...",
      localApplied: "局部修改已应用",
      partNeedInput: "先输入或画出局部修改",
      partUpdated: "{label} 已更新",
      sketchIdle: "草图待命",
      sketchLive: "草图实时同步中",
      sketchVision: "视觉细化中",
      sketchReady: "草图已细化"
    }
  },
  en: {
    common: {
      zh: "中文",
      en: "EN",
      close: "Close",
      active: "Active",
      useThis: "Use",
      save: "Save",
      remove: "Remove",
      drafts: "Drafts",
      noAi: "AI Not Ready",
      sketchOn: "Sketch Linked",
      sketchOff: "No Sketch",
      noData: "None"
    },
    landing: {
      eyebrow: "Speculative Furniture Study",
      title: "Table Generator",
      copy: "AI-assisted parametric table studies",
      button: "Enter"
    },
    chat: {
      title: "Guide the table with words and sketch",
      assistant: "Design Assistant",
      unifiedInput: "Input",
      inputTitle: "Prompt / Sketch / Config",
      promptPlaceholder: "Describe mood, size, use, or silhouette",
      generate: "Generate 3 Directions",
      generating: "Generating...",
      locks: "Locks",
      locksTitle: "Keep what works",
      understanding: "AI Understanding",
      understandingTitle: "Check the interpretation",
      understandingEmpty: "Generate once to see the summary",
      variants: "Directions",
      variantsTitle: "Pick a direction",
      variantsEmpty: "Three directions will appear here",
      localEdit: "Local Edit",
      localEditTitle: "Edit one area",
      scope: "Scope",
      localPlaceholder: "Describe the local change",
      apply: "Apply Local Edit",
      applying: "Applying...",
      lockShape: "Lock Shape",
      lockSize: "Lock Size",
      lockMaterial: "Lock Material",
      lockSurface: "Lock Surface",
      lockLegs: "Lock Legs",
      scopeOverall: "Overall",
      scopeFrontEdge: "Front Edge",
      scopeLeft: "Left Side",
      scopeCenter: "Center",
      scopeLegs: "Legs",
      intent: "Intent",
      constraints: "Constraints",
      sketchInfluence: "Sketch",
      nextQuestion: "Next"
    },
    control: {
      headerEyebrow: "Furniture Configurator",
      headerTitle: "Triangle Module Table",
      triangleSystem: "Triangle System",
      triangleTitle: "Upload motif or sketch",
      motif: "Module Motif",
      motifTitle: "Image mapping",
      patternSource: "Pattern Source",
      upload: "Upload Motif",
      removeMotif: "Remove Motif",
      patternPresence: "Pattern Presence",
      contrast: "Contrast",
      brightness: "Brightness",
      relief: "Relief",
      noMotif: "No Motif",
      motifReady: "Motif Ready",
      outline: "Outline Logic",
      outlineTitle: "Outline Source",
      outlineSource: "Outline Source",
      fallbackShape: "Base Shape",
      triangleSize: "Triangle Size",
      triangleThickness: "Triangle Thickness",
      moduleGap: "Module Gap",
      component: "Component Studio",
      componentTitle: "Per-part editing",
      pickPart: "Pick A Part",
      ecoMaterial: "Eco Material",
      tint: "Tint",
      localModuleSize: "Local Module Size",
      localThickness: "Local Thickness",
      legWidthScale: "Leg Width",
      legDepthScale: "Leg Depth",
      legLengthScale: "Leg Height",
      joinLogic: "Join Logic",
      joinLogicTitle: "Integrated shell strategy",
      sceneSurface: "Scene & Base",
      sceneSurfaceTitle: "Light and material",
      lightMode: "Scene",
      baseMaterial: "Base Material",
      dimensions: "Dimensions",
      dimensionsTitle: "Length / Width / Height",
      length: "Length",
      width: "Width",
      overallHeight: "Overall Height",
      legLength: "Leg Height",
      legSystem: "Leg System",
      legSystemTitle: "Leg setup",
      legShape: "Leg Shape",
      legHeight: "Leg Height",
      legWidth: "Leg Width",
      legDepth: "Leg Depth",
      legCount: "Leg Count",
      currentSelection: "Current Selection",
      currentSelectionTitle: "Current config",
      saveDraft: "Save Draft",
      availableMaterials: "Available materials",
      uploaded: "Uploaded",
      defaultMetal: "Default Metal"
    },
    drafts: {
      eyebrow: "Saved Drafts",
      title: "Comparison",
      empty: "No drafts yet",
      close: "Close"
    },
    part: {
      selected: "Selected Part",
      detected: "Detected",
      sketchpad: "Sketchpad",
      dialogue: "Dialogue",
      placeholder: "Describe how to modify this part",
      clear: "Clear Sketch",
      apply: "Apply Text / Sketch",
      ecoMaterial: "Eco Material",
      tint: "Tint"
    },
    join: {
      aria: "Triangular module connection concept",
      surface: "01 SURFACE SKIN",
      collar: "02 FOLDED COLLAR",
      core: "03 LOAD CORE",
      surfaceNote: "Read the tabletop as one continuous triangular skin",
      collarNote: "Carry the seam rhythm from top into the leg",
      coreNote: "Hide the structural core inside the same outer language"
    },
    variant: {
      clickHint: "Click B / C to enlarge",
      a: "A",
      b: "B",
      c: "C"
    },
    options: {
      scenario: {
        daylight: "Daylight",
        late_night: "Late Night",
        void: "Void"
      },
      shape: {
        rectangle: "Rectangle",
        round: "Round",
        oval: "Oval"
      },
      silhouette: {
        shape: "Preset Outline",
        sketch: "Sketch Outline"
      },
      pattern: {
        metal: "Metal Modules",
        uploaded: "Uploaded Motif"
      },
      legShape: {
        round: "Round",
        square: "Square",
        blade: "Blade"
      },
      material: {
        light_wood: "Light Wood",
        dark_walnut: "Dark Walnut",
        rough_stone: "Rough Stone",
        metal: "Metal"
      }
    },
    status: {
      start: "Start with a sentence, optionally sketch, then generate 3 directions",
      draftSaved: "Draft saved: {label}",
      draftRestored: "Draft restored: {label}",
      motifPreparing: "Preparing motif...",
      motifLinked: "Motif linked: {name}",
      motifRemoved: "Motif removed",
      needBrief: "Write a brief or add a sketch first",
      generating: "Generating 3 directions...",
      localDirections: "AI offline, local directions generated",
      directionsReady: "Three directions are ready",
      needLocalEdit: "Describe the local edit first",
      localApplying: "Applying local edit...",
      localApplied: "Local edit applied",
      partNeedInput: "Write or draw a local change first",
      partUpdated: "{label} updated",
      sketchIdle: "Sketch Idle",
      sketchLive: "Sketch Sync",
      sketchVision: "Vision Refinement",
      sketchReady: "Sketch refined"
    }
  }
};

function getValue(locale, path) {
  return path.split(".").reduce((accumulator, key) => accumulator?.[key], TEXT[locale]);
}

export function t(locale, key, vars = {}) {
  const template = getValue(locale, key) ?? getValue("en", key) ?? key;
  return Object.entries(vars).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
    template
  );
}

export function getLocalizedOptionLabel(locale, group, value) {
  return getValue(locale, `options.${group}.${value}`) ?? value;
}

export function localizeOptions(locale, group, collection) {
  return collection.map((item) => ({
    ...item,
    label: getLocalizedOptionLabel(locale, group, item.value)
  }));
}

export function getLocalizedDraftLabel(config, locale) {
  const shape =
    config.silhouetteMode === "sketch"
      ? locale === "zh"
        ? "草图模块"
        : "Sketch Mosaic"
      : getLocalizedOptionLabel(locale, "shape", config.shape);
  const material = getLocalizedOptionLabel(locale, "material", config.material);
  return `${shape} / ${material}`;
}
