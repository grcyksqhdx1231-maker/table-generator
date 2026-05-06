import Icon from "./Icon";

const EMPTY_COPY = {
  drafts: {
    zh: ["草稿库还是空的", "保存一次参数配置后，可以在这里快速恢复或发布到 Gallery。"],
    en: ["No drafts yet", "Save a configuration to restore it or publish it to Gallery later."],
    icon: "drafts"
  },
  favorites: {
    zh: ["还没有收藏", "在 Gallery 中收藏喜欢的桌款，它们会集中出现在这里。"],
    en: ["No favorites yet", "Favorite tables from Gallery and they will appear here."],
    icon: "favorite"
  },
  cart: {
    zh: ["购物车还是空的", "把准备报价或购买的桌款加入购物车后，这里会显示明细。"],
    en: ["Cart is empty", "Add table designs to review pricing and quantities here."],
    icon: "cart"
  },
  gallery: {
    zh: ["暂无 Gallery 条目", "生成当前 7 色系列或发布草稿后，这里会出现家具场景卡片。"],
    en: ["No gallery items", "Generate a seven-color series or publish drafts to fill this catalog."],
    icon: "gallery"
  },
  ai: {
    zh: ["等待生成方向", "输入需求或画出轮廓后，AI 会把当前参数整理成候选设计方向。"],
    en: ["Waiting for directions", "Describe a brief or sketch an outline to generate design directions."],
    icon: "ai"
  },
  bridge: {
    zh: ["等待 Rhino / GH", "发送参数后，系统会等待结构文件返回模块、连接件与预览网格。"],
    en: ["Waiting for Rhino / GH", "Send parameters to receive modules, connectors, and preview mesh data."],
    icon: "gh"
  },
  loading: {
    zh: ["正在组装参数", "参数线会逐步收束成桌面、桌腿与结构关系。"],
    en: ["Assembling parameters", "Parameter lines are resolving into tabletop, legs, and structure."],
    icon: "generate"
  }
};

export default function EmptyState({
  variant = "drafts",
  locale = "zh",
  title = "",
  detail = "",
  action = null,
  compact = false
}) {
  const copy = EMPTY_COPY[variant] || EMPTY_COPY.drafts;
  const [fallbackTitle, fallbackDetail] = copy[locale === "zh" ? "zh" : "en"];

  return (
    <div className={`empty-state empty-state--${variant} ${compact ? "empty-state--compact" : ""}`}>
      <div className="empty-state__graphic" aria-hidden="true">
        <svg className="empty-state__wire" viewBox="0 0 160 96">
          <path className="empty-state__line" d="M24 18H136" />
          <path className="empty-state__line" d="M24 34H136" />
          <path className="empty-state__line" d="M24 50H136" />
          <circle className="empty-state__node empty-state__node--active" cx="58" cy="18" r="5" />
          <circle className="empty-state__node" cx="104" cy="34" r="5" />
          <circle className="empty-state__node" cx="78" cy="50" r="5" />
          <path className="empty-state__table" d="M42 66H118" />
          <path className="empty-state__table" d="M56 66 48 86" />
          <path className="empty-state__table" d="M104 66 112 86" />
          <path className="empty-state__connector" d="M58 23 72 62" />
          <path className="empty-state__connector" d="M104 39 88 62" />
        </svg>
        <span className="empty-state__icon">
          <Icon name={copy.icon} />
        </span>
      </div>
      <div className="empty-state__copy">
        <strong>{title || fallbackTitle}</strong>
        <p>{detail || fallbackDetail}</p>
      </div>
      {action}
    </div>
  );
}
