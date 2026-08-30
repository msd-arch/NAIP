"use client";

import { useTranslations } from "next-intl";
import CropStressCanvas from "./CropStressCanvas";
import { useAppLocale } from "../../i18n/LocaleProvider";
import type { CropStressDistrict } from "../../explore/types";

function MiniRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-soft py-1 text-[11px]">
      <span className="text-dim">{k}</span>
      <span className="tnum font-medium text-main">{v}</span>
    </div>
  );
}

/** Real click-triggered popup for the Crop Stress Screen: unlike the
    Hazards popup, there's no selection menu here -- every district
    covered by this screen always has exactly the same two real signals
    (level anomaly, senescence-slope anomaly), so both render directly
    rather than making the user pick one. */
export default function CropStressPopupContent({ district, row }: { district: string; row: CropStressDistrict }) {
  const t = useTranslations();
  const { locale } = useAppLocale();

  return (
    <div className="w-[260px] font-sans">
      <h4 className="mb-2 text-sm font-semibold text-main">{district}</h4>

      <div className="mb-3">
        <MiniRow k="Level anomaly points" v={`${row.n_points_level_anomaly} / ${row.n_points}`} />
        <MiniRow k="Senescence-slope anomaly points" v={`${row.n_points_senescence_anomaly} / ${row.n_points}`} />
        <MiniRow k="Flagged on both signs" v={row.district_flag_both_signals ? "Yes" : "No"} />
      </div>

      <p className="mb-1 text-xs font-medium text-main">Level anomaly &mdash; vegetation thinning</p>
      <CropStressCanvas kind="level" nPoints={row.n_points} nAnomalyPoints={row.n_points_level_anomaly} />

      <p className="mb-1 mt-3 text-xs font-medium text-main">Senescence-slope anomaly &mdash; accelerated browning</p>
      <CropStressCanvas kind="senescence" nPoints={row.n_points} nAnomalyPoints={row.n_points_senescence_anomaly} />

      <div className="mt-3 rounded-md bg-elev-2 p-2 text-[11px] leading-relaxed text-dim">
        {locale === "ur" ? (
          <span dir="rtl" lang="ur" className="urdu-text">
            {t("cropStressCaveat")}
          </span>
        ) : (
          t("cropStressCaveat")
        )}
      </div>
    </div>
  );
}
