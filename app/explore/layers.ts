export type LayerId =
  | "home"
  | "hazards"
  | "locust"
  | "cropstress"
  | "canal"
  | "flood"
  | "drought"
  | "cropmodel"
  | "irrigation"
  | "crossyear"
  | "yield"
  | "exposure"
  | "trigger"
  | "forecast"
  | "models"
  | "history"
  | "register";

export type LayerMode = "choropleth" | "zoom-locust" | "zoom-canal" | "panel-only";

export interface LayerMeta {
  id: LayerId;
  group: string;
  label: string;
  /** Real Urdu translation of `label`, shown when the EN/UR toggle is set to
      Urdu -- see Track T (i18n). */
  labelUr: string;
  mode: LayerMode;
  about: string;
  /** Real Urdu translation of `about`. Slightly more condensed than the
      English, matching the same house style hazards.py's own real
      message_en/message_ur bilingual alert text already uses. */
  aboutUr: string;
}

export const LAYERS: Record<LayerId, LayerMeta> = {
  home: {
    id: "home",
    group: "",
    label: "Home",
    labelUr: "ہوم",
    mode: "choropleth",
    about:
      "National Agriculture Intelligence Platform — using satellites to spot weather hazards, track water and crops, and decide when a farmer might deserve a payout, across Pakistan.",
    aboutUr:
      "قومی زرعی انٹیلیجنس پلیٹ فارم — سیٹلائٹ کے ذریعے موسمی خطرات کی نشاندہی، پانی اور فصلوں کی نگرانی، اور کسان کو معاوضہ دینے کا فیصلہ، پورے پاکستان میں۔",
  },
  hazards: {
    id: "hazards",
    group: "Hazard Monitoring",
    label: "National Hazards",
    labelUr: "قومی خطرات",
    mode: "choropleth",
    about:
      "Every 15 minutes the satellite pipeline checks all 126 districts for 11 hazard types — frost, heat wave, hail, fog, dust storms and more. Darker districts have more active alerts right now.",
    aboutUr:
      "ہر 15 منٹ بعد سیٹلائٹ پائپ لائن تمام 126 اضلاع کو 11 اقسام کے خطرات کے لیے چیک کرتی ہے — پالا، گرمی کی لہر، اولے، دھند، دھول کے طوفان اور دیگر۔ گہرے رنگ کے اضلاع میں اس وقت زیادہ فعال الرٹس ہیں۔",
  },
  locust: {
    id: "locust",
    group: "Hazard Monitoring",
    label: "Locust Risk",
    labelUr: "ٹڈی دل کا خطرہ",
    mode: "zoom-locust",
    about:
      "Desert locust breeding needs damp soil and fresh green-up. This zooms into Tharparkar, Kharan and the Cholistan proxy area — the only regions arid enough to matter — and checks both conditions from satellite.",
    aboutUr:
      "ٹڈی دل کی افزائش کے لیے نم مٹی اور تازہ ہریالی درکار ہوتی ہے۔ یہ تھرپارکر، خاران اور چولستان کے متبادل علاقے پر مرکوز ہے — واحد خطے جو کافی بنجر ہیں — اور سیٹلائٹ سے دونوں شرائط جانچتا ہے۔",
  },
  cropstress: {
    id: "cropstress",
    group: "Hazard Monitoring",
    label: "Crop Stress Screen",
    labelUr: "فصل کے دباؤ کی اسکرین",
    mode: "choropleth",
    about:
      "Not a diagnosis — a screen. Flags districts where vegetation looks unusually low, or is declining faster than normal for this time of year, worth a closer look.",
    aboutUr:
      "یہ تشخیص نہیں، ایک اسکرین ہے۔ ان اضلاع کی نشاندہی کرتا ہے جہاں نباتات غیر معمولی طور پر کم ہیں، یا اس وقت کے معمول سے زیادہ تیزی سے گھٹ رہی ہیں۔",
  },
  canal: {
    id: "canal",
    group: "Water & Climate",
    label: "Canal Water Stress",
    labelUr: "نہر میں پانی کی کمی",
    mode: "zoom-canal",
    about:
      "Water in a canal gets used up as it travels, so the far end usually gets less than the start. This zooms into the Muridke Distributary and tracks that head-to-tail difference.",
    aboutUr:
      "نہر میں پانی سفر کے دوران استعمال ہوتا رہتا ہے، اس لیے دور والے سرے کو عموماً کم پانی ملتا ہے۔ یہ مریدکے ڈسٹری بیوٹری پر مرکوز ہو کر یہ فرق دکھاتا ہے۔",
  },
  flood: {
    id: "flood",
    group: "Water & Climate",
    label: "Flood Risk Screen",
    labelUr: "سیلاب کے خطرے کی اسکرین",
    mode: "choropleth",
    about:
      "Checks live satellite radar, water maps, and rainfall data to screen for raised flood risk. An early-warning signal, not a confirmed flood alert.",
    aboutUr:
      "براہ راست سیٹلائٹ ریڈار، پانی کے نقشے اور بارش کے اعداد و شمار کی جانچ کر کے سیلاب کے بڑھتے خطرے کی اسکرین کرتا ہے۔ یہ ابتدائی انتباہی اشارہ ہے، تصدیق شدہ سیلاب کا اعلان نہیں۔",
  },
  drought: {
    id: "drought",
    group: "Water & Climate",
    label: "National Drought Signal",
    labelUr: "قومی خشک سالی اشارہ",
    mode: "choropleth",
    about:
      "Compares this month's vegetation against each district's own multi-year satellite history. Flags places running drier than their own normal, not just drier than their neighbors.",
    aboutUr:
      "اس مہینے کی نباتات کا موازنہ ہر ضلع کی اپنی کئی سالہ سیٹلائٹ تاریخ سے کیا جاتا ہے۔ ان جگہوں کی نشاندہی کرتا ہے جو اپنے ہی معمول سے زیادہ خشک ہیں، صرف پڑوسیوں سے نہیں۔",
  },
  cropmodel: {
    id: "cropmodel",
    group: "Crop Intelligence",
    label: "National Crop Model",
    labelUr: "قومی فصل ماڈل",
    mode: "choropleth",
    about:
      "Estimated share of farmland growing wheat, cotton, rice or sugarcane per district. Government-reported where available, model-estimated for newer seasons, or a hand-reviewed fallback for the 11 districts with no official data.",
    aboutUr:
      "گندم، کپاس، چاول یا گنے کی کاشت کا تخمینی حصہ فی ضلع۔ جہاں دستیاب ہو وہاں سرکاری ڈیٹا، نئے موسموں کے لیے ماڈل کا تخمینہ، یا 11 اضلاع کے لیے دستی جائزہ جہاں سرکاری ڈیٹا موجود نہیں۔",
  },
  irrigation: {
    id: "irrigation",
    group: "Crop Intelligence",
    label: "Irrigation Classifier",
    labelUr: "آبپاشی کی درجہ بندی",
    mode: "panel-only",
    about:
      "Guesses whether a farm is irrigated by how green it looks in satellite images over the season. Not spatial at district scale, so the map steps back here.",
    aboutUr:
      "سیزن بھر سیٹلائٹ تصاویر میں فصل کتنی سرسبز نظر آتی ہے اس سے اندازہ لگاتا ہے کہ زمین سیراب ہے یا نہیں۔ ضلعی سطح پر مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
  crossyear: {
    id: "crossyear",
    group: "Crop Intelligence",
    label: "Cross-Year Validation",
    labelUr: "بین السنوات تصدیق",
    mode: "panel-only",
    about:
      "Trained on one year's real data, tested on another, to see if the crop model still works on a year it hasn't seen before. Not spatial, so the map steps back here.",
    aboutUr:
      "ایک سال کے حقیقی ڈیٹا پر تربیت دی گئی، دوسرے سال پر جانچی گئی، یہ دیکھنے کے لیے کہ آیا فصل کا ماڈل ایسے سال پر بھی کام کرتا ہے جو اس نے پہلے نہیں دیکھا۔ مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
  yield: {
    id: "yield",
    group: "Crop Intelligence",
    label: "Yield Prediction",
    labelUr: "پیداوار کی پیش گوئی",
    mode: "panel-only",
    about:
      "Tried predicting how much each district would harvest per hectare. Simply assuming this year matches last year usually beats the model — a real, honest finding. Not spatial, so the map steps back here.",
    aboutUr:
      "ہر ضلع کی فی ہیکٹر پیداوار کا اندازہ لگانے کی کوشش کی گئی۔ محض یہ فرض کرنا کہ اس سال کا نتیجہ پچھلے سال جیسا ہوگا عموماً ماڈل سے بہتر ثابت ہوتا ہے — ایک حقیقی، دیانتدارانہ نتیجہ۔ مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
  exposure: {
    id: "exposure",
    group: "Insurance Engine",
    label: "Exposure Risk",
    labelUr: "خطرے کی نمائش",
    mode: "choropleth",
    about:
      "Where a live hazard overlaps a crop in its vulnerable growth stage. Only the top 50 events are scored, covering a subset of districts — the rest aren't ruled safe, they're just not in this list yet.",
    aboutUr:
      "جہاں ایک فعال خطرہ فصل کے نازک مرحلے سے ٹکراتا ہے۔ صرف سب سے اوپر کے 50 واقعات کا اسکور کیا گیا ہے، جو اضلاع کے ایک حصے کا احاطہ کرتا ہے — باقی کو محفوظ قرار نہیں دیا گیا، وہ صرف ابھی اس فہرست میں نہیں ہیں۔",
  },
  trigger: {
    id: "trigger",
    group: "Insurance Engine",
    label: "Trigger Engine",
    labelUr: "ٹریگر انجن",
    mode: "choropleth",
    about:
      "Districts where an exposure event actually crossed the payout threshold. Every record carries its basis-risk note — a trigger measures the index, not any individual farmer's real loss.",
    aboutUr:
      "وہ اضلاع جہاں نمائش کا واقعہ واقعی معاوضے کی حد عبور کر گیا۔ ہر ریکارڈ کے ساتھ اس کا بنیادی خطرہ (basis risk) نوٹ درج ہے — ٹریگر انڈیکس کی پیمائش کرتا ہے، کسی فرد کسان کے حقیقی نقصان کی نہیں۔",
  },
  forecast: {
    id: "forecast",
    group: "Forecast",
    label: "72h Forecast (frost/heat/cold)",
    labelUr: "72 گھنٹے کی پیش گوئی (پالا/گرمی/سردی)",
    mode: "choropleth",
    about:
      "A real GFS weather-forecast layer, additive to the live hazard map — not a replacement. Covers only frost, heat wave, and cold wave (the 3 of 11 hazards with real compatible forecast data), 3 days ahead, refreshed each time it runs against the latest real GFS cycle (published 4x daily). This is a prediction, never a confirmed observation — kept structurally separate from the live hazard feed.",
    aboutUr:
      "ایک حقیقی GFS موسمی پیش گوئی کی تہہ، براہ راست خطرے کے نقشے کے علاوہ — متبادل نہیں۔ صرف پالا، گرمی کی لہر، اور سردی کی لہر کا احاطہ کرتا ہے (11 میں سے وہ 3 خطرات جن کے لیے موافق پیش گوئی ڈیٹا موجود ہے)، 3 دن آگے تک، ہر بار تازہ ترین GFS سائیکل کے خلاف چلنے پر تازہ ہوتا ہے (روزانہ 4 بار شائع ہوتا ہے)۔ یہ ایک پیش گوئی ہے، تصدیق شدہ مشاہدہ نہیں۔",
  },
  models: {
    id: "models",
    group: "",
    label: "About",
    labelUr: "تعارف",
    mode: "panel-only",
    about:
      "What this product is, and the trained models running in it — each shown next to the rule-based or naive baseline it had to beat. Not spatial, so the map steps back here.",
    aboutUr:
      "یہ پروڈکٹ کیا ہے، اور اس میں چلنے والے تربیت یافتہ ماڈلز — ہر ایک اس اصول یا سادہ بیس لائن کے ساتھ دکھایا گیا ہے جسے اسے شکست دینی تھی۔ مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
  history: {
    id: "history",
    group: "",
    label: "Historical Events",
    labelUr: "تاریخی واقعات",
    mode: "panel-only",
    about:
      "Real cross-year and cross-event generalization tests, browsable as event cards — fire, flood, locust, and crop models checked against real years/events they weren't trained on. Not spatial, so the map steps back here.",
    aboutUr:
      "حقیقی بین السنوات جانچ، ایونٹ کارڈز کی صورت میں — آگ، سیلاب، ٹڈی دل اور فصل کے ماڈلز کو ایسے حقیقی سالوں یا واقعات پر جانچا گیا جن پر انہیں تربیت نہیں دی گئی۔ مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
  register: {
    id: "register",
    group: "",
    label: "Farm Data",
    labelUr: "فارم ڈیٹا",
    mode: "panel-only",
    about:
      "Register a real farm's identity and crop data against the live Farm Registry. Write-only: your CNIC and phone number are never shown back on screen, only a masked reference. Not spatial, so the map steps back here.",
    aboutUr:
      "ایک حقیقی فارم کی شناخت اور فصل کا ڈیٹا لائیو فارم رجسٹری میں درج کریں۔ صرف تحریری اندراج: آپ کا شناختی کارڈ نمبر اور فون نمبر دوبارہ اسکرین پر کبھی نہیں دکھایا جاتا، صرف ایک نقاب شدہ حوالہ۔ مقامی نہیں، اس لیے نقشہ یہاں پیچھے ہٹ جاتا ہے۔",
  },
};

export interface LayerGroup {
  label: string;
  /** Real Urdu translation of `label` -- see Track T (i18n). */
  labelUr: string;
  layers: LayerId[];
  /** true = render as a single plain nav button, not a dropdown. Requires exactly one layer. */
  standalone?: boolean;
}

export const LAYER_GROUPS: LayerGroup[] = [
  { label: "Home", labelUr: "ہوم", layers: ["home"], standalone: true },
  { label: "Hazard Monitoring", labelUr: "خطرات کی نگرانی", layers: ["hazards", "locust", "cropstress"] },
  { label: "Water & Climate", labelUr: "پانی اور موسم", layers: ["canal", "flood", "drought"] },
  {
    label: "Crop Intelligence",
    labelUr: "فصل کی معلومات",
    layers: ["cropmodel", "irrigation", "crossyear", "yield"],
  },
  { label: "Insurance Engine", labelUr: "انشورنس نظام", layers: ["exposure", "trigger"] },
  { label: "Forecast", labelUr: "پیش گوئی", layers: ["forecast"], standalone: true },
  { label: "History", labelUr: "تاریخی واقعات", layers: ["history"], standalone: true },
  { label: "Farm Data", labelUr: "فارم ڈیٹا", layers: ["register"], standalone: true },
  { label: "About", labelUr: "تعارف", layers: ["models"], standalone: true },
];

export const CROPS = ["wheat", "cotton", "rice", "sugarcane"] as const;
export type Crop = (typeof CROPS)[number];
