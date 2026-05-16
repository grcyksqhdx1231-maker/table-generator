(function () {
  const DATA = window.BIRD_ACOUSTIC_HEATMAP_DATA;
  if (!DATA) {
    document.body.innerHTML =
      '<pre style="padding:24px">Missing web_bird_acoustic_heatmap_data.js</pre>';
    return;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const storedLang = (() => {
    try {
      return localStorage.getItem("birdHeatmapLang");
    } catch (error) {
      return "";
    }
  })();
  const state = {
    viewMode: "obs",
    cursorMode: "arrow",
    lang: storedLang === "en" ? "en" : "zh",
    speciesQuery: "",
    selectedSubtypes: new Set(DATA.subtypes.map((subtype) => subtype.key)),
    cycleSelectedSubtypes: new Set(DATA.subtypes.map((subtype) => subtype.key)),
    cycleYear: "all",
    hoverToken: 0,
    insightId: "signal",
    insightToken: 0,
  };

  const UI = {
    zh: {
      title: "上海鸟类记录 / 发声热图探索器",
      lead: "三种热图使用同一套“相对年内分布”口径：观测相对频率、发声相对频率，以及两者差值。箭头模式和探索模式都是全局生效的。",
      viewMode: "热图视图",
      cursorMode: "鼠标模式",
      subtype: "留居类型筛选",
      species: "单独看某一种鸟",
      how: "说明",
      howText: "观测热图和发声热图都已经统一成“该时段占本物种全年总量的比例”。差值热图 = 发声相对频率 - 观测相对频率。",
      clear: "清除单物种",
      placeholder: "输入中文名 / English / scientific name",
      inspector: "探索面板",
      inspectorLead: "切到探索模式后，把放大镜移到某个格子上，这里会显示该物种的图片、繁殖期、迁徙方向、是否上海本土，以及特殊类别说明。",
      inspectorEmpty: "等待你在热图上悬停某个物种的某个时段。",
      insightHeading: "洞察证据库",
      insightLead: "根据 Markdown 重新整理：每条 insight 都可以单独查看，证据来源可以点击跳转；相关物种按钮会直接定位到上方热图中的对应物种。",
      activeModeArrow: "当前：箭头模式",
      activeModeExplore: "当前：探索模式",
      arrowMode: "箭头模式",
      exploreMode: "探索模式",
      currentShown: "当前显示",
      speciesUnit: "个物种",
    },
    en: {
      title: "Shanghai Bird Record and Acoustic Heatmap Explorer",
      lead: "The three heatmaps use the same within-year relative distribution: observed share, heard share, and their difference. Arrow and Explore modes work globally across all views.",
      viewMode: "View mode",
      cursorMode: "Cursor mode",
      subtype: "Subtype filters",
      species: "Single-species focus",
      how: "How to read",
      howText: "Observed and heard heatmaps are both normalized as each period's share of the species' annual total. Difference heatmap = heard relative share minus observed relative share.",
      clear: "Clear species",
      placeholder: "Search Chinese / English / scientific name",
      inspector: "Explorer panel",
      inspectorLead: "Switch to Explore mode and hover over a cell to see the species photo, breeding window, migration direction, local status, and special notes.",
      inspectorEmpty: "Hover over a species-period cell to inspect it.",
      insightHeading: "Insight Evidence",
      insightLead: "Insights are reorganized from the Markdown file. Each item can be opened separately, evidence links are clickable, and related species buttons jump back to the heatmap.",
      activeModeArrow: "Current: Arrow",
      activeModeExplore: "Current: Explore",
      arrowMode: "Arrow mode",
      exploreMode: "Explore mode",
      currentShown: "Showing",
      speciesUnit: "species",
    },
  };

  const tooltip = document.getElementById("tooltip");
  const heatmapMount = document.getElementById("heatmapMount");
  const heatmapShell = document.getElementById("heatmapShell");
  const inspectorContent = document.getElementById("inspectorContent");
  const inspectorLead = document.getElementById("inspectorLead");
  const subtypeColors = {
    resident: "#76E288",
    passage_migrant: "#8FAAFF",
    summer_visitor: "#FFBB1E",
    winter_visitor: "#58CCEC",
  };
  DATA.subtypes.forEach((subtype) => {
    subtype.color = subtypeColors[subtype.key] || subtype.color;
  });
  const subtypeMeta = Object.fromEntries(DATA.subtypes.map((subtype) => [subtype.key, subtype]));
  const wikiCache = new Map();

  const viewMeta = {
    obs: {
      key: "obs",
      titleZh: "物种出现 / 被记录 × 48 时段热图",
      titleEn: "Recorded / observed heatmap",
      shortZh: "观测相对频率",
      shortEn: "Observed relative share",
      descZh: "每个时段在全年 estimated reporting checklists 中所占比例",
      descEn: "Share of annual estimated reporting checklists by period",
    },
    heard: {
      key: "heard",
      titleZh: "物种发声 × 48 时段热图",
      titleEn: "Acoustic heatmap",
      shortZh: "发声相对频率",
      shortEn: "Heard relative share",
      descZh: "每个时段在全年被听到记录中所占比例",
      descEn: "Share of annual heard records by period",
    },
    diff: {
      key: "diff",
      titleZh: "相对差值热图",
      titleEn: "Difference heatmap",
      shortZh: "发声 - 观测",
      shortEn: "Heard - observed",
      descZh: "发声相对频率减去观测相对频率",
      descEn: "Heard relative share minus observed relative share",
    },
  };

  const insightEn = {
    signal: {
      title: "First: these charts compare two different signals",
      subtitle: "Sound records are not abundance, and occurrence records are not abundance either.",
      strength: "Baseline",
      summary:
        "Sound records are closer to when birds are more likely to vocalize and be recorded, while occurrence records are closer to when birds are more likely to be observed or reported. Both are shaped by behavior, season, habitat, weather, and observer effort.",
      points: [
        "Vocal peaks often reflect courtship, territorial defense, flight calls during migration, or flock communication.",
        "Occurrence peaks may include real abundance changes, but they can also reflect detectability and observer effort.",
        "The difference heatmap should be read as a mismatch between visual and acoustic seasonal distributions, not as direct population change.",
      ],
    },
    resident: {
      title: "Residents: present year-round does not mean uniform year-round",
      subtitle: "April vocal peaks reflect breeding behavior; July dips likely reflect lower detectability.",
      strength: "Strong / medium",
      summary:
        "Resident birds can occur in or around Shanghai throughout the year, but spring breeding songs, summer chick care, molt, and dense vegetation can still create seasonal variation in both heard and observed records.",
      points: [
        "April vocal peak: courtship, nesting, territory establishment, and stronger song output.",
        "July occurrence dip: likely linked to late breeding, molt, more hidden behavior, and dense summer vegetation.",
        "The November vocal peak is a possible non-breeding-season signal, but the evidence is weaker than the spring breeding explanation.",
      ],
    },
    summer: {
      title: "Summer visitors: arrival and departure create two peaks",
      subtitle: "April-May is arrival and breeding; August-September is departure and autumn migration.",
      strength: "Strong",
      summary:
        "Summer visitors return in spring to breeding or warm-season activity areas and leave in autumn for wintering areas. Their double-peak pattern matches this annual cycle.",
      points: [
        "April-May peak: arrival, courtship, territory establishment, and breeding activity.",
        "August-September peak: post-breeding departure, southward migration, flight calls, and increased movement.",
        "If acoustic data include recordings or automated audio, the autumn peak may include many migration flight calls.",
      ],
    },
    winter: {
      title: "Winter visitors: cross-year stays with stronger sound near arrival/departure",
      subtitle: "November and February-March likely mark arrival and pre-departure activity.",
      strength: "Strong",
      summary:
        "Winter visitors usually arrive from northern breeding grounds in autumn and winter, stay around Shanghai or the Yangtze estuary, and return north in spring. Occurrence can be stable across winter, while sound may peak around transition periods.",
      points: [
        "November peak: arrival or wintering-area establishment.",
        "February-March peak: activity before northward spring migration.",
        "January sits in the middle of wintering and often lacks local breeding-song motivation.",
        "Lower vegetation cover and visible waterbird flocks can improve winter visibility, but observer effort still matters.",
      ],
    },
    wagtail: {
      title: "Eastern Yellow Wagtail: an August peak under a winter-visitor label",
      subtitle: "The August peak is better read as autumn passage, not a wintering peak.",
      strength: "Strong",
      summary:
        "Eastern Yellow Wagtail often has both passage migrant and winter visitor roles at regional scales. Its August peak in Shanghai shows that residency labels can shift with place and season.",
      points: [
        "A winter visitor label does not mean the species appears only in winter.",
        "The August peak is more likely autumn southward passage.",
        "This example shows that residency type is regional, not a fixed species property.",
      ],
    },
    passage: {
      title: "Passage migrants: the clearest spring-autumn double peak",
      subtitle: "April-May marks northward migration; August-November marks southward migration.",
      strength: "Strong",
      summary:
        "Passage migrants briefly use Shanghai while moving between breeding and wintering grounds. Spring and autumn migration create clear double peaks in both occurrence and acoustic signals.",
      points: [
        "April-May corresponds to spring northward migration and stopover.",
        "August-November corresponds to autumn southward migration; different taxa make the autumn window broader.",
        "A few February-March peaks should be checked at species level: early migrants, wintering individuals, labels, or name alignment may be involved.",
      ],
    },
    "shanghai-node": {
      title: "Shanghai is a compound ecological node, not a single-season site",
      subtitle: "The Yangtze estuary, tidal flats, wetlands, and urban green spaces overlap.",
      strength: "Strong",
      summary:
        "Shanghai can function as a spring stopover, autumn stopover, wintering destination, and urban green-space habitat at the same time. This makes the boundary between winter visitor and passage migrant naturally fuzzy.",
      points: [
        "The same species may show passage, stopover, and limited wintering in Shanghai.",
        "The Yangtze estuary and coastal tidal flats provide stopover and wintering space for waterbirds.",
        "Urban green spaces can also create seasonal record peaks for woodland and shrubland birds.",
      ],
    },
  };

  const INSIGHTS = [
    {
      id: "signal",
      no: "0",
      title: "先明确：图表在比较两类不同信号",
      subtitle: "发声记录不等于真实数量，出现记录也不等于真实数量。",
      strength: "基础前提",
      color: "#8FAAFF",
      imageSpecies: "Parus cinereus",
      summary:
        "发声记录更接近“什么时候更容易发声并被录到”，出现记录更接近“什么时候更容易被人观察/记录到”。两者都受到行为、季节、栖息地、天气和观测努力影响。",
      points: [
        "发声高峰常与求偶、领域防御、迁徙飞行叫声和群体交流有关。",
        "出现高峰可能包含真实数量变化，也可能来自可检测性和观测努力变化。",
        "因此差值热图应理解为“视觉记录与声音记录在年内分布上的错位”，不是直接的种群数量差。",
      ],
      evidence: [
        ["Cornell Lab：7 月后许多鸟停止或减少鸣唱", "https://www.allaboutbirds.org/news/ive-been-hearing-beautiful-bird-songs-every-morning-since-spring-but-suddenly-im-not-hearing-birds-at-all-what-happened-to-them/"],
        ["eBird Best Practices：记录受可检测性、观测努力、天气等影响", "https://ebird.github.io/ebird-best-practices/ebird.html"],
        ["Morelli et al. 2022：鸟类调查存在 imperfect detection", "https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2021.671492/full"],
      ],
      species: ["Parus cinereus", "Aegithalos glaucogularis"],
    },
    {
      id: "resident",
      no: "1",
      title: "留鸟：全年在地，但不等于全年均匀",
      subtitle: "4 月发声高峰更像繁殖行为，7 月低谷更像可检测性下降。",
      strength: "强 / 中",
      color: "#76E288",
      imageSpecies: "Aegithalos glaucogularis",
      summary:
        "留鸟全年可在上海或周边活动，但春季繁殖鸣唱、夏季育雏/换羽和植被遮挡会让发声记录与出现记录产生季节性波动。",
      points: [
        "4 月发声高峰：对应求偶、筑巢、领域建立和鸣唱增强。",
        "7 月出现记录低谷：可能与育雏后期、换羽、行为隐蔽和夏季植被茂密有关。",
        "11 月发声高峰可作为可能解释：非繁殖季领域维持、群体交流或环境变化，但证据强度低于春季解释。",
      ],
      evidence: [
        ["Cornell Lab：鸟类春季鸣唱与 7 月后鸣唱减少", "https://www.allaboutbirds.org/news/ive-been-hearing-beautiful-bird-songs-every-morning-since-spring-but-suddenly-im-not-hearing-birds-at-all-what-happened-to-them/"],
        ["Cornell Bird Academy：鸟鸣与领域、防御、求偶有关", "https://academy.allaboutbirds.org/birdsong/"],
        ["eBird Best Practices：可检测性随季节和栖息地变化", "https://ebird.github.io/ebird-best-practices/ebird.html"],
        ["Anderson et al. 2015：视觉检测会受密集植被影响", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4482497/"],
      ],
      species: ["Aegithalos glaucogularis", "Parus cinereus", "Ardea alba"],
    },
    {
      id: "summer",
      no: "2",
      title: "夏候鸟：春季抵达与秋季离境形成双峰",
      subtitle: "4-5 月是到达和繁殖信号，8-9 月是离境和秋迁信号。",
      strength: "强",
      color: "#FFBB1E",
      imageSpecies: "Calliope calliope",
      summary:
        "夏候鸟通常春季返回繁殖地或暖季活动地，秋季离开前往越冬地。因此发声和出现记录的双峰与年周期过程吻合。",
      points: [
        "4-5 月峰值：春季到达、求偶、领域建立和繁殖活动增强。",
        "8-9 月峰值：繁殖结束后离境、南迁、迁徙飞行叫声和个体移动增加。",
        "如果声音来自自动录音或声音记录库，秋季峰也可能包含较多 flight calls。",
      ],
      evidence: [
        ["国家林草局：夏候鸟春夏回繁殖地、秋冬南迁", "https://www.forestry.gov.cn/c/www/zhzs/562400.jhtml"],
        ["上海市政府/解放日报：崇明东滩春季环志窗口", "https://www.shanghai.gov.cn/nw4411/20240401/5a6905a29bbe45fa894c1fe8947f921e.html"],
        ["新华社：8 月下旬崇明东滩进入鸻鹬类过境高峰", "https://www.news.cn/politics/2022-10/07/c_1129054208.htm"],
        ["BOU：许多鸣禽夜迁会发出 flight calls", "https://bou.org.uk/blog-gayk-migrations-and-calls/"],
      ],
      species: ["Calliope calliope", "Limosa limosa", "Calidris ruficollis"],
    },
    {
      id: "winter",
      no: "3",
      title: "冬候鸟：跨年停留，声音峰更靠近迁入/迁出",
      subtitle: "11 月和 2-3 月更像越冬地建立与春季北返前后的活动增强。",
      strength: "强",
      color: "#58CCEC",
      imageSpecies: "Turdus obscurus",
      summary:
        "冬候鸟通常秋冬从北方繁殖地到上海及长江口湿地越冬，次年春季北返。出现记录跨年较稳定，发声记录则可能在迁入和离境窗口更强。",
      points: [
        "11 月峰：秋季到达或越冬地稳定建立阶段。",
        "2-3 月峰：春季北返前后活动增强。",
        "1 月处于越冬中段，缺少本地繁殖鸣唱动机，声音记录可能低。",
        "冬季植被遮挡少、水鸟集群明显，会提高部分物种的可见度，但仍受观测努力影响。",
      ],
      evidence: [
        ["国家林草局：冬候鸟秋冬来、次年春夏回北方繁殖地", "https://www.forestry.gov.cn/c/www/zhzs/562400.jhtml"],
        ["上海观察/解放日报：上海是迁徙中转站和越冬目的地", "https://www.jfdaily.com/sgh/detail?id=1151369"],
        ["解放日报：九段沙是停歇地和越冬场所", "https://www.jfdaily.com/sgh/detail?id=1704295"],
        ["Cornell Bird Academy：鸟鸣与领域、防御、求偶相关", "https://academy.allaboutbirds.org/birdsong/"],
      ],
      species: ["Turdus obscurus", "Turdus pallidus", "Phalacrocorax carbo"],
    },
    {
      id: "wagtail",
      no: "4",
      title: "东方黄鹡鸰：冬候鸟标签下的 8 月高峰",
      subtitle: "8 月高峰更应解释为秋季过境，而不是越冬高峰。",
      strength: "强",
      color: "#58CCEC",
      imageSpecies: "Motacilla tschutschensis",
      summary:
        "东方黄鹡鸰在区域尺度上常具有 passage migrant + winter visitor 的双重属性。上海数据中 8 月高峰说明留居类型标签会随地区和季节尺度改变。",
      points: [
        "表中标注 winter visitor 不一定代表全年只在冬季出现。",
        "8 月高峰更可能是秋季南迁开始后的过境记录。",
        "这个例子适合用来说明：留居类型是区域性标签，不是固定不变的物种属性。",
      ],
      evidence: [
        ["Hong Kong Avifauna：common passage migrant and winter visitor", "https://avifauna.hkbws.org.hk/species/0440/053510"],
        ["Hong Kong Avifauna：tschutschensis 为 passage migrant/rare winter visitor", "https://avifauna.hkbws.org.hk/species/0440/053520"],
        ["Wild Beijing：东方黄鹡鸰秋季 8 月中旬到 10 月上旬过境", "https://wildbeijing.org/nocturnal-bird-migration-in-beijing-autumn-2021/"],
        ["Shanghai Birding：Yellow Wagtail 复合类群繁殖和越冬范围", "https://www.shanghaibirding.com/tag/yellow-wagtail/"],
        ["Audubon：Eastern Yellow Wagtail 到达和离开阿拉斯加时间", "https://www.audubon.org/field-guide/bird/eastern-yellow-wagtail"],
      ],
      species: ["Motacilla tschutschensis"],
    },
    {
      id: "passage",
      no: "5",
      title: "旅鸟：最典型的是春秋双峰",
      subtitle: "4-5 月北迁，8-11 月南迁，秋季窗口通常更宽。",
      strength: "强",
      color: "#8FAAFF",
      imageSpecies: "Calidris alpina",
      summary:
        "旅鸟在繁殖地与越冬地之间迁徙时短暂停留上海。春季北迁和秋季南迁使出现记录与发声记录形成双峰结构。",
      points: [
        "4-5 月对应春季北迁和停歇。",
        "8-11 月对应秋季南迁；不同类群迁徙时序差异使秋季窗口更长。",
        "个别 2-3 月高峰需要按物种核对，可能来自早迁、越冬个体、标签错误或名称对齐问题。",
      ],
      evidence: [
        ["国家林草局：旅鸟定义为春秋迁徙季节飞过或短暂出现", "https://www.forestry.gov.cn/c/www/zhzs/562400.jhtml"],
        ["上海市政府/解放日报：崇明东滩春季环志窗口", "https://www.shanghai.gov.cn/nw4411/20240401/5a6905a29bbe45fa894c1fe8947f921e.html"],
        ["新华社：8 月下旬进入鸻鹬类过境高峰", "https://www.news.cn/politics/2022-10/07/c_1129054208.htm"],
        ["上海观察/解放日报：9-10 月为上海秋季迁徙观鸟时期", "https://www.jfdaily.com/sgh/detail?id=1151369"],
        ["UNESCO：黄海/渤海湿地是 EAAF 不可替代停歇地", "https://whc.unesco.org/en/list/1606/"],
      ],
      species: ["Calidris alpina", "Calidris temminckii", "Motacilla tschutschensis"],
    },
    {
      id: "shanghai-node",
      no: "6",
      title: "上海是复合生态节点，不是单一季节地点",
      subtitle: "长江入海口、滩涂湿地和城市绿地叠加，制造边界模糊。",
      strength: "强",
      color: "#76E288",
      imageSpecies: "Ardea alba",
      summary:
        "上海同时承担春季北迁停歇、秋季南迁停歇、越冬目的地、城市绿地活动地等功能，所以冬候鸟/旅鸟边界会在图表中变得模糊。",
      points: [
        "同一物种在上海可能同时表现为过境、停歇和少量越冬。",
        "长江入海口和沿海滩涂为水鸟提供迁徙停歇和越冬空间。",
        "城市绿地让部分林鸟在迁徙和非繁殖季也能形成记录高值。",
      ],
      evidence: [
        ["国家发改委等：候鸟迁飞通道保护修复中国行动计划", "https://www.ndrc.gov.cn/xxgk/zcfb/tz/202406/P020240624568949062260.pdf"],
        ["上海观察/解放日报：上海处于 EAAF 重要中转位置", "https://www.jfdaily.com/sgh/detail?id=1151369"],
        ["新华社：崇明东滩每年近 300 种候鸟栖息或过境", "https://www.news.cn/politics/2022-10/07/c_1129054208.htm"],
      ],
      species: ["Ardea alba", "Calidris alpina", "Phalacrocorax carbo"],
    },
  ];

  function qs(sel) {
    return document.querySelector(sel);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function labelZhEn(zh, en) {
    return state.lang === "zh"
      ? `<span>${escapeHtml(zh)}</span><small> / ${escapeHtml(en)}</small>`
      : `<span>${escapeHtml(en)}</span><small> / ${escapeHtml(zh)}</small>`;
  }

  function textByLang(zh, en) {
    return state.lang === "zh" ? zh : en;
  }

  function currentUi() {
    return UI[state.lang] || UI.zh;
  }

  function renderLandingText() {
    const landing =
      state.lang === "zh"
        ? {
            brand: "上海鸟类 / 声景年周期",
            topLink: "进入热图",
            kicker: "Shanghai bird acoustic visualization",
            title: "从记录到声音，探索上海鸟类的年周期",
            lead: "滚动进入 48 时段热图，在同一套逻辑下比较物种出现、发声和差值，并从留鸟、旅鸟、夏候鸟、冬候鸟的节律里读出上海作为生态节点的角色。",
            start: "开始探索",
            line: "查看折线图",
            insight: "查看洞察",
            metricA: "个物种进入清洗后的可视化",
            metricB: "个年内阶段用于对齐观测与发声",
            metricC: "张热图：出现、发声、差值",
            scroll: "向下滚动",
            labelA: "夏候鸟 / Summer",
            labelB: "冬候鸟 / Winter",
            labelC: "旅鸟 / Passage",
          }
        : {
            brand: "Shanghai Birds / Acoustic Cycle",
            topLink: "Enter heatmaps",
            kicker: "Shanghai bird acoustic visualization",
            title: "Explore Shanghai birds through records and sound",
            lead: "Scroll into the 48-period heatmaps to compare occurrence, acoustic records, and their difference under one shared logic, then read Shanghai's ecological role through residents, passage migrants, summer visitors, and winter visitors.",
            start: "Start exploring",
            line: "View line chart",
            insight: "View insights",
            metricA: "cleaned species in the visualization",
            metricB: "within-year periods aligning occurrence and sound",
            metricC: "heatmaps: occurrence, sound, difference",
            scroll: "Scroll",
            labelA: "Summer visitors",
            labelB: "Winter visitors",
            labelC: "Passage migrants",
          };
    const setText = (selector, value) => {
      const node = qs(selector);
      if (node) node.textContent = value;
    };
    setText("#landingBrand", landing.brand);
    setText("#landingTopLink", landing.topLink);
    setText("#landingKicker", landing.kicker);
    setText("#landingTitle", landing.title);
    setText("#landingLead", landing.lead);
    setText("#landingStartText", landing.start);
    setText("#landingLineLink", landing.line);
    setText("#landingInsightLink", landing.insight);
    setText("#landingMetricA", landing.metricA);
    setText("#landingMetricB", landing.metricB);
    setText("#landingMetricC", landing.metricC);
    setText("#landingScroll", landing.scroll);
    setText("#landingLabelA", landing.labelA);
    setText("#landingLabelB", landing.labelB);
    setText("#landingLabelC", landing.labelC);
  }

  function insightText(insight) {
    if (state.lang === "zh") return insight;
    const translated = insightEn[insight.id] || {};
    return {
      ...insight,
      ...translated,
      points: translated.points || insight.points,
    };
  }

  function viewArray(species) {
    if (state.viewMode === "obs") return species.obsShares;
    if (state.viewMode === "heard") return species.heardShares;
    return species.diffShares;
  }

  function formatValue(value) {
    return state.viewMode === "diff" ? value.toFixed(4) : value.toFixed(4);
  }

  function periodLabel(periodOrder) {
    const meta = DATA.periods[periodOrder - 1];
    return `${meta.labelZh} / ${meta.labelEn}`;
  }

  function selectedSubtypeKeys() {
    return DATA.subtypes.map((subtype) => subtype.key).filter((key) => state.selectedSubtypes.has(key));
  }

  function filterSpecies() {
    const query = state.speciesQuery.trim().toLowerCase();
    return DATA.species.filter((species) => {
      if (!state.selectedSubtypes.has(species.subtype)) return false;
      if (!query) return true;
      const hay = `${species.birdNameCn || ""} ${species.birdNameEn || ""} ${species.scientificName || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }

  function currentSpeciesCount() {
    return filterSpecies().length;
  }

  function computeCycleSeries() {
    return DATA.subtypes.map((subtype) => {
      const species = DATA.species.filter((item) => item.subtype === subtype.key);
      const values = DATA.periods.map((_, periodIndex) => {
        if (!species.length) return 0;
        const total = species.reduce((sum, item) => sum + (Number(item.obsShares?.[periodIndex]) || 0), 0);
        return total / species.length;
      });
      return {
        key: subtype.key,
        labelZh: subtype.labelZh,
        labelEn: subtype.labelEn,
        color: subtype.color,
        speciesCount: species.length,
        values,
      };
    });
  }

  const cycleSeries = computeCycleSeries();

  function sequentialObsColor(value, maxValue) {
    const t = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
    const start = [255, 252, 240];
    const end = [255, 187, 30];
    const r = Math.round(start[0] + (end[0] - start[0]) * t);
    const g = Math.round(start[1] + (end[1] - start[1]) * t);
    const b = Math.round(start[2] + (end[2] - start[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

  function sequentialHeardColor(value, maxValue) {
    const t = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
    const start = [242, 252, 255];
    const end = [88, 204, 236];
    const r = Math.round(start[0] + (end[0] - start[0]) * t);
    const g = Math.round(start[1] + (end[1] - start[1]) * t);
    const b = Math.round(start[2] + (end[2] - start[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

  function divergingDiffColor(value, maxAbs) {
    const t = maxAbs > 0 ? Math.max(-1, Math.min(1, value / maxAbs)) : 0;
    if (t >= 0) {
      const start = [250, 250, 250];
      const end = [255, 187, 30];
      const u = t;
      const r = Math.round(start[0] + (end[0] - start[0]) * u);
      const g = Math.round(start[1] + (end[1] - start[1]) * u);
      const b = Math.round(start[2] + (end[2] - start[2]) * u);
      return `rgb(${r},${g},${b})`;
    }
    const start = [250, 250, 250];
    const end = [143, 170, 255];
    const u = Math.abs(t);
    const r = Math.round(start[0] + (end[0] - start[0]) * u);
    const g = Math.round(start[1] + (end[1] - start[1]) * u);
    const b = Math.round(start[2] + (end[2] - start[2]) * u);
    return `rgb(${r},${g},${b})`;
  }

  function colorForValue(value, scaleMeta) {
    if (state.viewMode === "obs") return sequentialObsColor(value, scaleMeta.max);
    if (state.viewMode === "heard") return sequentialHeardColor(value, scaleMeta.max);
    return divergingDiffColor(value, scaleMeta.maxAbs);
  }

  function computeScaleMeta(speciesList) {
    const values = speciesList.flatMap((species) => viewArray(species));
    if (state.viewMode === "diff") {
      const maxAbs = values.reduce((best, value) => Math.max(best, Math.abs(value)), 0);
      return { maxAbs: maxAbs || 1e-9 };
    }
    const max = values.reduce((best, value) => Math.max(best, value), 0);
    return { max: max || 1e-9 };
  }

  function noteApplies(note, periodOrder) {
    if (note.appliesTo === "always") return true;
    if (note.appliesTo === "summer_dip") return periodOrder >= 21 && periodOrder <= 28;
    if (note.appliesTo === "winter_dip") return periodOrder >= 45 || periodOrder <= 4;
    return true;
  }

  function noteHint(note) {
    if (note.appliesTo === "summer_dip") return "适用：6–7月格子 / Applies to Jun–Jul cells";
    if (note.appliesTo === "winter_dip") return "适用：12–1月格子 / Applies to Dec–Jan cells";
    return "适用：整只鸟 / Applies across the species";
  }

  function localHref(ref) {
    if (!ref.isLocal) return ref.url;
    return encodeURI(`file:///${ref.url.replace(/\\/g, "/")}`);
  }

  function renderStaticText() {
    const ui = currentUi();
    renderLandingText();
    qs("#pageTitle").textContent = ui.title;
    qs("#pageLead").textContent = ui.lead;
    qs("#viewModeHeading").innerHTML = state.lang === "zh" ? '热图视图 <span class="sub">View mode</span>' : 'View mode <span class="sub">热图视图</span>';
    qs("#cursorModeHeading").innerHTML = state.lang === "zh" ? '鼠标模式 <span class="sub">Cursor mode</span>' : 'Cursor mode <span class="sub">鼠标模式</span>';
    qs("#subtypeHeading").innerHTML = state.lang === "zh" ? '留居类型筛选 <span class="sub">Subtype filters</span>' : 'Subtype filters <span class="sub">留居类型筛选</span>';
    qs("#speciesHeading").innerHTML = state.lang === "zh" ? '单独看某一种鸟 <span class="sub">Single-species focus</span>' : 'Single-species focus <span class="sub">单独看某一种鸟</span>';
    qs("#howHeading").innerHTML = state.lang === "zh" ? '说明 <span class="sub">How to read</span>' : 'How to read <span class="sub">说明</span>';
    qs("#howText").textContent = ui.howText;
    qs("#clearSpeciesBtn").textContent = ui.clear;
    qs("#speciesSearch").setAttribute("placeholder", ui.placeholder);
    qs("#inspectorTitle").textContent = ui.inspector;
    qs("#inspectorLead").textContent = ui.inspectorLead;
    const empty = qs("#inspectorEmpty");
    if (empty) empty.textContent = ui.inspectorEmpty;
    qs("#insightHeading").textContent = ui.insightHeading;
    qs("#insightLead").textContent = ui.insightLead;
    const toggle = qs("#langToggle");
    toggle.innerHTML = state.lang === "zh" ? "<strong>CH</strong> / EN" : "CH / <strong>EN</strong>";
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.body.dataset.lang = state.lang;
    document.body.dataset.cursorMode = state.cursorMode;
  }

  function renderReferenceLinks(refs) {
    return (refs || [])
      .map((ref) => {
        const href = localHref(ref);
        const label = `${ref.labelZh} / ${ref.labelEn}`;
        return `<a class="link-pill" href="${escapeHtml(href)}" data-nav-href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
      })
      .join("");
  }

  function renderButtons() {
    const ui = currentUi();
    const currentModeLabel =
      state.cursorMode === "arrow" ? textByLang("箭头", "Arrow") : textByLang("探索", "Explore");
    qs("#viewModeButtons").innerHTML = Object.values(viewMeta)
      .map(
        (view) => `
          <button class="btn with-badge ${state.viewMode === view.key ? "active" : ""}" data-view="${view.key}">
            ${labelZhEn(view.shortZh, view.shortEn)}
            <span class="mode-badge">${escapeHtml(currentModeLabel)}</span>
          </button>`,
      )
      .join("");
    qs("#viewModeButtons").querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.viewMode = button.dataset.view;
        renderAll();
      });
    });

    qs("#cursorModeButtons").innerHTML = `
      <button class="btn cursor-btn ${state.cursorMode === "arrow" ? "active" : ""}" data-cursor="arrow">${textByLang("箭头模式", "Arrow mode")}</button>
      <button class="btn cursor-btn ${state.cursorMode === "explore" ? "active" : ""}" data-cursor="explore">${textByLang("探索模式", "Explore mode")}</button>
    `;
    qs("#cursorModeButtons").querySelectorAll("[data-cursor]").forEach((button) => {
      button.addEventListener("click", () => {
        state.cursorMode = button.dataset.cursor;
        renderAll();
        if (state.cursorMode === "arrow") {
          inspectorLead.textContent = textByLang(
            "箭头模式下用普通鼠标悬停，信息会跟着鼠标出现；切到探索模式后，右侧面板会展开更丰富的资料。",
            "In Arrow mode, hover with the normal cursor for a lightweight tooltip. Switch to Explore mode for richer details in the right panel.",
          );
          inspectorContent.innerHTML =
            `<div class="empty-state">${escapeHtml(
              textByLang(
                "切到探索模式后，把放大镜移到某个格子上，这里会显示图片、繁殖期、迁徙方向和特殊说明。",
                "Switch to Explore mode and move over a cell to see photo, breeding window, migration direction, and special notes.",
              ),
            )}</div>`;
        }
      });
    });

    qs("#subtypeButtons").innerHTML = DATA.subtypes
      .map(
        (subtype) => {
          const isActive = state.selectedSubtypes.has(subtype.key);
          const activeStyle = `background:${subtype.color}; border-color:${subtype.color}; color:#111; box-shadow:0 0 0 1px rgba(255,255,255,.76) inset, 0 10px 28px ${subtype.color}44`;
          const inactiveStyle = `border-color:${subtype.color}; color:#111; background:${subtype.color}22`;
          return `
          <button class="chip subtype-chip ${isActive ? "active" : ""}" data-subtype="${subtype.key}" style="${isActive ? activeStyle : inactiveStyle};">
            ${labelZhEn(subtype.labelZh, subtype.labelEn)}
          </button>`;
        },
      )
      .join("");
    qs("#subtypeButtons").querySelectorAll("[data-subtype]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.subtype;
        if (state.selectedSubtypes.has(key) && state.selectedSubtypes.size > 1) {
          state.selectedSubtypes.delete(key);
        } else {
          state.selectedSubtypes.add(key);
        }
        renderAll();
      });
    });
  }

  function renderSpeciesList() {
    const list = qs("#speciesList");
    list.innerHTML = DATA.species
      .map(
        (species) =>
          `<option value="${escapeHtml(species.scientificName)}">${escapeHtml(
            `${species.birdNameCn || ""} | ${species.birdNameEn || ""}`,
          )}</option>`,
      )
      .join("");
  }

  function renderModeStatus() {
    const ui = currentUi();
    const view = viewMeta[state.viewMode];
    qs("#viewStatus").textContent = textByLang(view.descZh, view.descEn);
    qs("#cursorStatus").textContent =
      state.cursorMode === "arrow"
        ? textByLang(
            "当前：箭头模式。三种热图都可用，跟随鼠标显示轻量信息卡。",
            "Current: Arrow mode. It works in all three heatmaps and shows a lightweight hover card.",
          )
        : textByLang(
            "当前：探索模式。热图边框变为黄色，右侧面板会显示深度信息。",
            "Current: Explore mode. The heatmap border turns yellow and the right panel shows detailed information.",
          );
    const subtypeLabels = selectedSubtypeKeys()
      .map((key) => textByLang(subtypeMeta[key].labelZh, subtypeMeta[key].labelEn))
      .join(state.lang === "zh" ? "、" : ", ");
    qs("#subtypeStatus").textContent = textByLang(`当前启用：${subtypeLabels}`, `Enabled: ${subtypeLabels}`);
    const speciesCount = currentSpeciesCount();
    qs("#speciesStatus").textContent =
      state.speciesQuery.trim()
        ? textByLang(`当前匹配 ${speciesCount} 个物种；如果只匹配 1 个，就会显示单种热图。`, `Matched ${speciesCount} species. If only one species matches, a single-species heatmap is shown.`)
        : textByLang(`当前显示 ${speciesCount} 个物种。`, `Showing ${speciesCount} species.`);
    heatmapShell.classList.toggle("explore-mode", state.cursorMode === "explore");
    heatmapShell.classList.toggle("arrow-mode", state.cursorMode === "arrow");
    document.body.dataset.cursorMode = state.cursorMode;
  }

  function renderLegend(scaleMeta) {
    const meta = viewMeta[state.viewMode];
    if (state.viewMode === "diff") {
      qs("#heatmapLegend").innerHTML = `
        <span><span class="legend-swatch" style="background:${divergingDiffColor(-scaleMeta.maxAbs, scaleMeta.maxAbs)}"></span>${textByLang("更偏被观测", "More observed")}</span>
        <span><span class="legend-swatch" style="background:${divergingDiffColor(0, scaleMeta.maxAbs)}"></span>${textByLang("接近 0", "Near zero")}</span>
        <span><span class="legend-swatch" style="background:${divergingDiffColor(scaleMeta.maxAbs, scaleMeta.maxAbs)}"></span>${textByLang("更偏被听到", "More heard")}</span>
      `;
    } else {
      const leftColor = colorForValue(0, scaleMeta);
      const rightColor = colorForValue(scaleMeta.max, scaleMeta);
      qs("#heatmapLegend").innerHTML = `
        <span><span class="legend-swatch" style="background:${leftColor}"></span>${textByLang(`${meta.shortZh}低`, `Low ${meta.shortEn}`)}</span>
        <span><span class="legend-swatch" style="background:${rightColor}"></span>${textByLang(`${meta.shortZh}高`, `High ${meta.shortEn}`)}</span>
      `;
    }
  }

  function renderCycleLineChart() {
    const heading = qs("#cycleLineHeading");
    const lead = qs("#cycleLineLead");
    const note = qs("#cycleLineNote");
    const yearSelect = qs("#cycleYearSelect");
    const buttonMount = qs("#cycleSubtypeButtons");
    const mount = qs("#cycleLineMount");
    if (!heading || !lead || !note || !yearSelect || !buttonMount || !mount) return;

    heading.textContent = textByLang("四类鸟观测活动频率折线图", "Observation-frequency lines by residency type");
    lead.textContent = textByLang(
      "基于 eBird reporting rate 的 48 时段观测频率。每种鸟先转换为自己的年内相对分布，再在留居类型内取平均；这样比原始数量更能展示四类鸟自身的年周期活动结构。",
      "These 48-period lines use eBird reporting-rate based observation frequency. Each species is first converted to its own within-year relative distribution, then averaged within residency type; this is more suitable than raw counts for comparing annual activity structure.",
    );
    note.textContent = textByLang(
      "说明：当前项目文件只保留了 2009-2026 合并后的 48 时段 reporting rate，没有保留逐年切片；因此年度下拉先显示合并版。拿到含年份的原始 eBird 表后，可以扩展为逐年切换。",
      "Note: the current project files only retain the 2009-2026 combined 48-period reporting rates, not year-by-year slices. The year selector therefore shows the combined view for now; it can be extended once a source table with year is available.",
    );
    yearSelect.innerHTML = `<option value="all">${textByLang("2009-2026 合并", "2009-2026 combined")}</option>`;
    yearSelect.value = state.cycleYear;
    yearSelect.onchange = () => {
      state.cycleYear = yearSelect.value;
      renderCycleLineChart();
    };

    buttonMount.innerHTML = DATA.subtypes
      .map((subtype) => {
        const isActive = state.cycleSelectedSubtypes.has(subtype.key);
        const activeStyle = `background:${subtype.color}; border-color:${subtype.color}; color:#111; box-shadow:0 0 0 1px rgba(255,255,255,.76) inset, 0 10px 28px ${subtype.color}44`;
        const inactiveStyle = `border-color:${subtype.color}; color:#111; background:${subtype.color}20`;
        return `
          <button class="chip cycle-subtype-chip ${isActive ? "active" : ""}" data-cycle-subtype="${subtype.key}" style="${isActive ? activeStyle : inactiveStyle};">
            ${labelZhEn(subtype.labelZh, subtype.labelEn)}
          </button>`;
      })
      .join("");
    buttonMount.querySelectorAll("[data-cycle-subtype]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.cycleSubtype;
        if (state.cycleSelectedSubtypes.has(key) && state.cycleSelectedSubtypes.size > 1) {
          state.cycleSelectedSubtypes.delete(key);
        } else {
          state.cycleSelectedSubtypes.add(key);
        }
        renderCycleLineChart();
      });
    });

    const activeSeries = cycleSeries.filter((series) => state.cycleSelectedSubtypes.has(series.key));
    const width = 1320;
    const height = 440;
    const left = 72;
    const right = 32;
    const top = 34;
    const bottom = 72;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...activeSeries.flatMap((series) => series.values), 0.0001);
    const niceMax = Math.max(0.0001, Math.ceil(maxValue * 1000) / 1000);
    const xFor = (index) => left + (index / 47) * plotWidth;
    const yFor = (value) => top + plotHeight - (value / niceMax) * plotHeight;
    const yTicks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

    const gridLines = yTicks
      .map((tick) => {
        const y = yFor(tick);
        return `
          <line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="rgba(17,17,17,.08)" />
          <text class="cycle-grid-label" x="${left - 10}" y="${y + 4}" text-anchor="end">${(tick * 100).toFixed(1)}%</text>`;
      })
      .join("");
    const monthLabels = DATA.periods
      .filter((_, index) => index % 4 === 0)
      .map((period, monthIndex) => {
        const x = left + ((monthIndex * 4 + 1.5) / 47) * plotWidth;
        const label = state.lang === "zh" ? `${period.month}月` : period.labelEn.split(" ")[0];
        return `<text x="${x}" y="${height - 28}" text-anchor="middle" fill="rgba(17,17,17,.58)" font-size="12">${escapeHtml(label)}</text>`;
      })
      .join("");
    const monthLines = DATA.periods
      .map((_, index) => {
        if (index % 4 !== 0) return "";
        const x = xFor(index);
        return `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotHeight}" stroke="rgba(17,17,17,.10)" />`;
      })
      .join("");

    const seriesMarkup = activeSeries
      .map((series) => {
        const points = series.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
        const dots = series.values
          .map((value, index) => {
            const period = DATA.periods[index];
            const label = `${textByLang(series.labelZh, series.labelEn)} | ${period.labelZh} / ${period.labelEn} | ${(value * 100).toFixed(2)}%`;
            return `<circle class="cycle-dot" cx="${xFor(index)}" cy="${yFor(value)}" r="3.6" fill="${series.color}" data-cycle-tip="${escapeHtml(label)}"></circle>`;
          })
          .join("");
        return `
          <polyline class="cycle-line" points="${points}" stroke="${series.color}" />
          ${dots}`;
      })
      .join("");

    const legend = activeSeries
      .map((series, index) => {
        const x = left + index * 220;
        return `
          <g transform="translate(${x},${height - 52})">
            <rect width="14" height="14" rx="3" fill="${series.color}"></rect>
            <text x="22" y="12" fill="rgba(17,17,17,.78)" font-size="13">${escapeHtml(textByLang(series.labelZh, series.labelEn))} (${series.speciesCount})</text>
          </g>`;
      })
      .join("");

    mount.innerHTML = `
      <svg class="svg-root" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
        textByLang("四类鸟观测频率折线图", "Observation-frequency lines by residency type"),
      )}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="rgba(255,255,255,.34)"></rect>
        ${gridLines}
        ${monthLines}
        <line x1="${left}" y1="${top + plotHeight}" x2="${left + plotWidth}" y2="${top + plotHeight}" stroke="rgba(17,17,17,.22)" />
        <line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" stroke="rgba(17,17,17,.22)" />
        ${seriesMarkup}
        ${monthLabels}
        ${legend}
        <text x="${left}" y="18" fill="rgba(17,17,17,.62)" font-size="12">${escapeHtml(
          textByLang("纵轴：观测 reporting rate；横轴：48 个年内阶段", "Y axis: observation reporting rate; X axis: 48 within-year periods"),
        )}</text>
      </svg>`;
    mount.querySelectorAll("[data-cycle-tip]").forEach((dot) => {
      dot.addEventListener("mouseenter", (event) => {
        showTooltip(event, `<div>${escapeHtml(dot.dataset.cycleTip)}</div>`);
      });
      dot.addEventListener("mousemove", (event) => {
        showTooltip(event, `<div>${escapeHtml(dot.dataset.cycleTip)}</div>`);
      });
      dot.addEventListener("mouseleave", hideTooltip);
    });
  }

  function renderTooltip(species, periodOrder, value) {
    return `
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(species.birdNameCn || species.birdNameEn || species.scientificName)}</div>
      <div><strong>English</strong>: ${escapeHtml(species.birdNameEn || "—")}</div>
      <div><strong>Scientific</strong>: <em>${escapeHtml(species.scientificName)}</em></div>
      <div><strong>${textByLang("留居类型", "Subtype")}</strong>: ${escapeHtml(textByLang(subtypeMeta[species.subtype].labelZh, subtypeMeta[species.subtype].labelEn))}</div>
      <div><strong>${textByLang("时段", "Period")}</strong>: ${escapeHtml(periodLabel(periodOrder))}</div>
      <div><strong>${escapeHtml(viewMeta[state.viewMode].shortZh)} / ${escapeHtml(
        viewMeta[state.viewMode].shortEn,
      )}</strong>: ${formatValue(value)}</div>
    `;
  }

  function showTooltip(event, html) {
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    const pad = 14;
    const rect = tooltip.getBoundingClientRect();
    let left = event.clientX + 16;
    let top = event.clientY + 16;
    if (left + rect.width > window.innerWidth - pad) left = event.clientX - rect.width - 16;
    if (top + rect.height > window.innerHeight - pad) top = event.clientY - rect.height - 16;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltip.style.display = "none";
  }

  async function loadWikiSummary(scientificName) {
    if (wikiCache.has(scientificName)) return wikiCache.get(scientificName);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Wiki summary ${response.status}`);
      const data = await response.json();
      const normalized = {
        title: data.title || scientificName,
        extract: data.extract || "",
        thumbnail: data.thumbnail?.source || "",
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(scientificName)}`,
      };
      wikiCache.set(scientificName, normalized);
      return normalized;
    } catch (error) {
      const fallback = {
        title: scientificName,
        extract: "",
        thumbnail: "",
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(scientificName)}`,
      };
      wikiCache.set(scientificName, fallback);
      return fallback;
    }
  }

  function renderInspectorSkeleton(species, periodOrder, value) {
    const applicableNotes = species.specialNotes || [];
    const currentPeriod = periodLabel(periodOrder);
    const allRefs = [
      ...(species.localStatus.refs || []),
      ...(species.breeding.refs || []),
      ...(species.migration.refs || []),
    ];
    inspectorContent.innerHTML = `
      <div class="species-photo" id="speciesPhoto">正在加载图片 / Loading image...</div>
      <div class="info-grid">
        <div class="info-block">
          <h3>${escapeHtml(species.birdNameCn || species.birdNameEn || species.scientificName)}</h3>
          <div class="meta-list">
            <div class="meta-row"><strong>English</strong><span>${escapeHtml(species.birdNameEn || "—")}</span></div>
            <div class="meta-row"><strong>Scientific</strong><span><em>${escapeHtml(species.scientificName)}</em></span></div>
            <div class="meta-row"><strong>留居类型</strong><span>${escapeHtml(subtypeMeta[species.subtype].labelZh)} / ${escapeHtml(subtypeMeta[species.subtype].labelEn)}</span></div>
            <div class="meta-row"><strong>当前时段</strong><span>${escapeHtml(currentPeriod)}</span></div>
            <div class="meta-row"><strong>当前视图值</strong><span>${formatValue(value)}</span></div>
            <div class="meta-row"><strong>观测峰值</strong><span>${escapeHtml(periodLabel(species.obsPeakPeriod))}</span></div>
            <div class="meta-row"><strong>发声峰值</strong><span>${escapeHtml(periodLabel(species.heardPeakPeriod))}</span></div>
          </div>
        </div>

        <div class="info-block">
          <h3>是否上海本土鸟 / Native status</h3>
          <p>${escapeHtml(species.localStatus.zh)}<br><span class="sub">${escapeHtml(species.localStatus.en)}</span></p>
          <div class="link-list">${renderReferenceLinks(species.localStatus.refs)}</div>
        </div>

        <div class="info-block">
          <h3>繁殖期说明 / Breeding window</h3>
          <p>${escapeHtml(species.breeding.zh)}<br><span class="sub">${escapeHtml(species.breeding.en)}</span></p>
          <div class="link-list">${renderReferenceLinks(species.breeding.refs)}</div>
        </div>

        <div class="info-block">
          <h3>迁徙方向 / Migration direction</h3>
          <p>${escapeHtml(species.migration.zh)}<br><span class="sub">${escapeHtml(species.migration.en)}</span></p>
          <div class="link-list">${renderReferenceLinks(species.migration.refs)}</div>
        </div>

        <div class="info-block">
          <h3>数据总量 / Totals</h3>
          <div class="meta-list">
            <div class="meta-row"><strong>Observed total</strong><span>${species.estimatedChecklistTotal}</span></div>
            <div class="meta-row"><strong>Heard total</strong><span>${species.heardCountTotal}</span></div>
            <div class="meta-row"><strong>Difference peak</strong><span>${escapeHtml(periodLabel(species.diffExtremePeriod))}</span></div>
          </div>
        </div>
      </div>
      ${
        applicableNotes.length
          ? `<div class="info-block" style="margin-top:12px">
              <h3>特殊说明 / Special notes</h3>
              ${applicableNotes
                .map((note) => {
                  const active = noteApplies(note, periodOrder);
                  return `
                    <div class="note-box" style="${active ? "" : "opacity:.76;background:#fdf8ef"}">
                      <h4>${escapeHtml(note.titleZh)} / ${escapeHtml(note.titleEn)}</h4>
                      <p>${escapeHtml(note.bodyZh)}<br><span class="sub">${escapeHtml(note.bodyEn)}</span></p>
                      <div class="status-line">${escapeHtml(noteHint(note))}</div>
                      <div class="link-list">${renderReferenceLinks(note.refs)}</div>
                    </div>
                  `;
                })
                .join("")}
            </div>`
          : ""
      }
      <div class="info-block" style="margin-top:12px">
        <h3>更多资料 / More links</h3>
        <div class="link-list">${renderReferenceLinks(allRefs)}</div>
      </div>
    `;
  }

  async function updateInspector(species, periodOrder, value) {
    const token = ++state.hoverToken;
    renderInspectorSkeleton(species, periodOrder, value);
    const photoMount = document.getElementById("speciesPhoto");
    const summary = await loadWikiSummary(species.wikiTitle);
    if (token !== state.hoverToken) return;
    if (!photoMount) return;
    if (summary.thumbnail) {
      photoMount.innerHTML = `<a href="${escapeHtml(summary.url)}" data-nav-href="${escapeHtml(summary.url)}" style="display:block;width:100%;height:100%"><img src="${escapeHtml(summary.thumbnail)}" alt="${escapeHtml(species.birdNameEn || species.scientificName)}"></a>`;
    } else {
      photoMount.innerHTML = `<div style="padding:18px;text-align:center"><strong>${escapeHtml(species.birdNameEn || species.scientificName)}</strong><div class="sub" style="margin-top:8px">Wikipedia image unavailable; click links below for details.</div></div>`;
    }
  }

  function findSpeciesByScientificName(scientificName) {
    const needle = String(scientificName || "").toLowerCase();
    return DATA.species.find((species) => species.scientificName.toLowerCase() === needle);
  }

  function renderInsightList() {
    const mount = qs("#insightList");
    if (!mount) return;
    mount.innerHTML = INSIGHTS.map(
      (insight) => {
        const text = insightText(insight);
        return `
        <button class="insight-tab ${state.insightId === insight.id ? "active" : ""}" data-insight-id="${escapeHtml(insight.id)}" style="${state.insightId === insight.id ? `border-color:${insight.color}; background:${insight.color}33` : ""}">
          <strong>${escapeHtml(insight.no)}. ${escapeHtml(text.title)}</strong>
          <span>${escapeHtml(text.subtitle)}</span>
        </button>
      `;
      },
    ).join("");
    mount.querySelectorAll("[data-insight-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.insightId = button.dataset.insightId;
        renderInsights();
      });
    });
  }

  function renderEvidenceLinks(evidence) {
    return evidence
      .map(
        ([label, url]) => `
          <a class="evidence-link" href="${escapeHtml(url)}" data-nav-href="${escapeHtml(url)}">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(url)}</span>
          </a>
        `,
      )
      .join("");
  }

  function renderRelatedSpeciesButtons(speciesNames) {
    return speciesNames
      .map((scientificName) => {
        const species = findSpeciesByScientificName(scientificName);
        const label = species
          ? `${species.birdNameCn || species.birdNameEn || species.scientificName} / ${species.birdNameEn || species.scientificName}`
          : scientificName;
        const color = species ? subtypeMeta[species.subtype]?.color || "#ddd" : "#ddd";
        return `
          <button class="species-jump" data-species-name="${escapeHtml(scientificName)}" style="background:${escapeHtml(color)}33;border-color:${escapeHtml(color)}">
            ${escapeHtml(label)}
          </button>
        `;
      })
      .join("");
  }

  function focusSpeciesFromInsight(scientificName) {
    const species = findSpeciesByScientificName(scientificName);
    if (!species) return;
    state.speciesQuery = species.scientificName;
    state.selectedSubtypes = new Set([species.subtype]);
    const input = qs("#speciesSearch");
    if (input) input.value = species.scientificName;
    renderAll();
    const heatmapCard = qs("#heatmapMount");
    if (heatmapCard) heatmapCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderInsightDetailShell(insight) {
    const text = insightText(insight);
    const species = findSpeciesByScientificName(insight.imageSpecies);
    const imageLabel = species
      ? `${species.birdNameCn || species.birdNameEn || species.scientificName} / ${species.birdNameEn || species.scientificName}`
      : insight.imageSpecies;
    const strengthBg =
      insight.strength === "强"
        ? "rgba(118,226,136,.55)"
        : insight.strength.includes("中")
          ? "rgba(255,187,30,.48)"
          : "rgba(143,170,255,.42)";

    qs("#insightDetail").innerHTML = `
      <div class="insight-hero">
        <div>
          <div class="insight-kicker">Insight ${escapeHtml(insight.no)} / ${escapeHtml(text.strength)}</div>
          <h2 class="insight-title">${escapeHtml(text.title)}</h2>
          <p class="insight-summary">${escapeHtml(text.summary)}</p>
          <div style="margin-top:12px">
            <span class="strength-pill" style="background:${strengthBg};border-color:${escapeHtml(insight.color)}">${escapeHtml(text.strength)}</span>
          </div>
        </div>
        <div class="insight-image" id="insightImage">
          <div style="padding:18px;text-align:center">${escapeHtml(imageLabel)}<br><span class="sub">Loading image...</span></div>
        </div>
      </div>
      <div class="insight-grid">
        <section class="insight-box">
          <h3>${textByLang("核心解释", "Explanation")}</h3>
          <ul>
            ${text.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        </section>
        <section class="insight-box">
          <h3>${textByLang("相关物种", "Related species")}</h3>
          <div class="species-jump-row">${renderRelatedSpeciesButtons(insight.species)}</div>
        </section>
        <section class="insight-box">
          <h3>${textByLang("证据来源", "Evidence links")}</h3>
          <div class="evidence-list">${renderEvidenceLinks(insight.evidence)}</div>
        </section>
      </div>
    `;

    qs("#insightDetail").querySelectorAll("[data-species-name]").forEach((button) => {
      button.addEventListener("click", () => focusSpeciesFromInsight(button.dataset.speciesName));
    });
  }

  async function updateInsightImage(insight) {
    const imageMount = qs("#insightImage");
    if (!imageMount) return;
    const token = ++state.insightToken;
    const species = findSpeciesByScientificName(insight.imageSpecies);
    const wikiTitle = species?.wikiTitle || insight.imageSpecies;
    const summary = await loadWikiSummary(wikiTitle);
    if (token !== state.insightToken) return;
    const imageLabel = species
      ? `${species.birdNameCn || species.birdNameEn || species.scientificName} / ${species.birdNameEn || species.scientificName}`
      : insight.imageSpecies;
    if (summary.thumbnail) {
      imageMount.innerHTML = `<a href="${escapeHtml(summary.url)}" data-nav-href="${escapeHtml(summary.url)}" style="display:block;width:100%;height:100%"><img src="${escapeHtml(summary.thumbnail)}" alt="${escapeHtml(imageLabel)}"></a>`;
    } else {
      imageMount.innerHTML = `<div style="padding:18px;text-align:center"><strong>${escapeHtml(imageLabel)}</strong><br><span class="sub">图片暂不可用，点击证据链接继续查看。</span></div>`;
    }
  }

  function renderInsights() {
    const insight = INSIGHTS.find((item) => item.id === state.insightId) || INSIGHTS[0];
    state.insightId = insight.id;
    renderInsightList();
    renderInsightDetailShell(insight);
    updateInsightImage(insight);
  }

  function renderHeatmap() {
    const speciesList = filterSpecies();
    const title = viewMeta[state.viewMode];
    qs("#heatmapTitle").textContent = textByLang(title.titleZh, title.titleEn);
    qs("#heatmapSummary").textContent = textByLang(
      `${title.descZh} | 当前显示 ${speciesList.length} 个物种 | 当前鼠标模式对三种热图全局生效`,
      `${title.descEn} | Showing ${speciesList.length} species | Cursor mode applies to all three heatmaps`,
    );

    if (!speciesList.length) {
      heatmapMount.innerHTML = '<div class="empty-state">没有匹配的物种。试着放宽物种搜索或重新打开某个留居类型。</div>';
      return;
    }

    const scaleMeta = computeScaleMeta(speciesList);
    renderLegend(scaleMeta);

    const rowHeight = speciesList.length === 1 ? 44 : speciesList.length <= 12 ? 24 : 16;
    const width = 1400;
    const left = speciesList.length === 1 ? 300 : 270;
    const top = 44;
    const right = 30;
    const plotWidth = width - left - right;
    const height = top + speciesList.length * rowHeight + 46;
    const step = plotWidth / 48;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "svg-root");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    for (let i = 0; i <= 48; i += 1) {
      const x = left + i * step;
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(x));
      line.setAttribute("y1", String(top));
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(height - 28));
      line.setAttribute("stroke", i % 4 === 0 ? "rgba(17,17,17,0.18)" : "rgba(17,17,17,0.075)");
      svg.appendChild(line);
    }

    for (let month = 0; month < 12; month += 1) {
      const x = left + (month * 4 + 2) * step;
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(height - 8));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("fill", "rgba(17,17,17,0.56)");
      text.textContent = `${DATA.periods[month * 4].labelZh.split(" ")[0]}/${DATA.periods[month * 4].labelEn.split(" ")[0]}`;
      svg.appendChild(text);
    }

    let currentSubtype = null;
    speciesList.forEach((species, rowIndex) => {
      const y = top + rowIndex * rowHeight;

      if (species.subtype !== currentSubtype) {
        currentSubtype = species.subtype;
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", String(left));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(left + plotWidth));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "rgba(17,17,17,0.35)");
        line.setAttribute("stroke-width", "1.3");
        svg.appendChild(line);

        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", "228");
        label.setAttribute("y", String(y + Math.min(12, rowHeight - 2)));
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", speciesList.length === 1 ? "16" : "13");
        label.setAttribute("font-weight", "700");
        label.setAttribute("fill", subtypeMeta[currentSubtype].color);
        label.textContent = `${subtypeMeta[currentSubtype].labelZh} / ${subtypeMeta[currentSubtype].labelEn}`;
        svg.appendChild(label);
      }

      const name = species.birdNameCn || species.birdNameEn || species.scientificName;
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(left - 10));
      label.setAttribute("y", String(y + rowHeight * 0.72));
      label.setAttribute("text-anchor", "end");
      label.setAttribute("font-size", speciesList.length === 1 ? "16" : rowHeight <= 16 ? "10.5" : "12");
      label.setAttribute("fill", "rgba(17,17,17,0.76)");
      label.textContent = name;
      svg.appendChild(label);

      const values = viewArray(species);
      values.forEach((value, periodIndex) => {
        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", String(left + periodIndex * step));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(step));
        rect.setAttribute("height", String(rowHeight));
        rect.setAttribute("fill", colorForValue(value, scaleMeta));
        rect.setAttribute("stroke", "rgba(255,255,255,0.48)");
        rect.dataset.speciesId = species.id;
        rect.dataset.period = String(periodIndex + 1);
        rect.dataset.value = String(value);
        rect.classList.add("heat-cell");
        rect.addEventListener("mouseenter", (event) => {
          if (state.cursorMode === "arrow") {
            showTooltip(event, renderTooltip(species, periodIndex + 1, value));
          } else {
            hideTooltip();
            updateInspector(species, periodIndex + 1, value);
          }
        });
        rect.addEventListener("mousemove", (event) => {
          if (state.cursorMode === "arrow") {
            showTooltip(event, renderTooltip(species, periodIndex + 1, value));
          } else {
            hideTooltip();
          }
        });
        rect.addEventListener("mouseleave", () => {
          if (state.cursorMode === "arrow") hideTooltip();
        });
        svg.appendChild(rect);
      });
    });

    const border = document.createElementNS(SVG_NS, "rect");
    border.setAttribute("x", String(left));
    border.setAttribute("y", String(top));
    border.setAttribute("width", String(plotWidth));
    border.setAttribute("height", String(speciesList.length * rowHeight));
    border.setAttribute("fill", "none");
    border.setAttribute("stroke", "rgba(17,17,17,0.28)");
    border.setAttribute("stroke-width", "1.2");
    svg.appendChild(border);

    heatmapMount.innerHTML = "";
    heatmapMount.appendChild(svg);
  }

  function renderAll() {
    renderStaticText();
    renderButtons();
    renderModeStatus();
    renderHeatmap();
    renderCycleLineChart();
    renderInsights();
  }

  function bindInputs() {
    const speciesSearch = qs("#speciesSearch");
    speciesSearch.addEventListener("input", () => {
      state.speciesQuery = speciesSearch.value;
      renderAll();
    });
    qs("#clearSpeciesBtn").addEventListener("click", () => {
      state.speciesQuery = "";
      speciesSearch.value = "";
      renderAll();
    });
    qs("#langToggle").addEventListener("click", () => {
      switchLanguage();
    });
  }

  function switchLanguage(nextLang) {
    state.lang = nextLang || (state.lang === "zh" ? "en" : "zh");
    try {
      localStorage.setItem("birdHeatmapLang", state.lang);
    } catch (error) {
      // Ignore storage failures on restricted file:// contexts.
    }
    renderAll();
  }

  window.switchBirdHeatmapLanguage = switchLanguage;

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-nav-href]");
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute("data-nav-href");
    if (!href) return;
    window.location.href = href;
  });

  renderSpeciesList();
  bindInputs();
  renderAll();
})();
