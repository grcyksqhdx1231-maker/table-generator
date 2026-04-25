import TableViewport from "./TableViewport";
import { t } from "../lib/i18n";

function getOrderedVariants(variants, activeVariantId) {
  if (!variants.length) {
    return [];
  }

  const active =
    variants.find((variant) => variant.id === activeVariantId) ?? variants[0];
  const others = variants.filter((variant) => variant.id !== active.id).slice(0, 2);
  return [active, ...others];
}

export default function VariantViewportGrid({
  variants,
  activeVariantId,
  onSelectVariant,
  phase,
  patternAsset,
  sketchMaskDataUrl,
  sketchOutline,
  mainOverlay,
  onSelectPart,
  partOverrides,
  selectedPartId,
  ghPreviewMesh,
  locale
}) {
  const ordered = getOrderedVariants(variants, activeVariantId);

  if (!ordered.length) {
    return null;
  }

  const [mainVariant, ...secondaryVariants] = ordered;

  return (
    <div className="variant-layout">
      <article className="variant-layout__main">
        <div className="variant-layout__main-frame">
          <TableViewport
            config={mainVariant.config}
            ghPreviewMesh={ghPreviewMesh}
            selectedPartId={selectedPartId}
            onSelectPart={onSelectPart}
            partOverrides={partOverrides}
            patternAsset={patternAsset}
            phase={phase}
            sketchMaskDataUrl={sketchMaskDataUrl}
            sketchOutline={sketchOutline}
            variantLabel={t(locale, "variant.a")}
          />
          <div className="variant-layout__caption">
            <span className="status-chip is-ready">{mainVariant.title}</span>
            <p className="panel__note">{t(locale, "variant.clickHint")}</p>
          </div>
        </div>
        {mainOverlay}
      </article>

      <div className="variant-layout__secondary">
        {secondaryVariants.map((variant, index) => (
          <article className="variant-layout__thumb" key={variant.id}>
            <button
              className="variant-layout__swap"
              onClick={() => onSelectVariant(variant)}
              type="button"
            >
              <TableViewport
                config={variant.config}
                interactive={false}
                partOverrides={partOverrides}
                patternAsset={patternAsset}
                phase={phase}
                selectedPartId=""
                sketchMaskDataUrl=""
                sketchOutline={[]}
                variantLabel={index === 0 ? t(locale, "variant.b") : t(locale, "variant.c")}
              />
              <div className="variant-layout__caption">
                <span className="status-chip">{variant.title}</span>
              </div>
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
