export type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "image";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
};

export type ListItemField = { key: string; label: string; type: "text" | "textarea" | "image" };

export type SectionSchema = {
  type: string;
  label: string;
  description: string;
  group: "هیرو" | "کاتالوگ" | "محتوا" | "بازاریابی";
  fields: Field[];
  list?: { key: string; label: string; itemFields: ListItemField[]; defaults: Record<string, string> };
  defaults: Record<string, unknown>;
};

const CTA: Field[] = [
  { key: "ctaLabel", label: "متن دکمه", type: "text", placeholder: "مشاهده کالکشن" },
  { key: "ctaHref", label: "لینک دکمه", type: "text", placeholder: "/products" },
];

const HEADING: Field[] = [
  { key: "eyebrow", label: "برچسب بالای عنوان", type: "text", placeholder: "کالکشن پاییز" },
  { key: "title", label: "عنوان", type: "text", placeholder: "دوخت آرام، پوشیدن آسان" },
  { key: "subtitle", label: "توضیح کوتاه", type: "textarea" },
];

const SORTS: Field["options"] = [
  { value: "newest", label: "جدیدترین" },
  { value: "best", label: "پرفروش‌ترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
];

export const SECTION_SCHEMAS: SectionSchema[] = [
  {
    type: "hero",
    label: "هیرو اصلی",
    description: "بخش ابتدایی صفحه با تصویر بزرگ و دکمه اقدام.",
    group: "هیرو",
    fields: [
      ...HEADING,
      { key: "image", label: "تصویر", type: "image" },
      { key: "variant", label: "چیدمان", type: "select", options: [
        { value: "split", label: "دو ستونه (متن + تصویر)" },
        { value: "full", label: "تمام‌عرض با تصویر پس‌زمینه" },
      ] },
      ...CTA,
      { key: "secondaryLabel", label: "دکمه دوم", type: "text" },
      { key: "secondaryHref", label: "لینک دکمه دوم", type: "text" },
    ],
    defaults: {
      eyebrow: "کالکشن پاییز ۱۴۰۴",
      title: "دوخت آرام، پوشیدن آسان",
      subtitle: "پارچه‌های طبیعی، برش‌های ماندگار و تولید محدود برای کسانی که تفاوت را در جزئیات می‌بینند.",
      image: "/media/hero/hero.jpg",
      variant: "split",
      ctaLabel: "مشاهده کالکشن",
      ctaHref: "/products",
      secondaryLabel: "داستان برند",
      secondaryHref: "/about",
    },
  },
  {
    type: "image_slider",
    label: "اسلایدر تصویری",
    description: "چند تصویر افقی با عنوان و لینک.",
    group: "هیرو",
    fields: [...HEADING],
    list: {
      key: "items",
      label: "اسلایدها",
      itemFields: [
        { key: "image", label: "تصویر", type: "image" },
        { key: "title", label: "عنوان", type: "text" },
        { key: "href", label: "لینک", type: "text" },
      ],
      defaults: { image: "/media/categories/women.jpg", title: "کالکشن زنانه", href: "/categories/women" },
    },
    defaults: { title: "کالکشن‌های فصل", items: [] },
  },
  {
    type: "featured_categories",
    label: "دسته‌بندی‌های منتخب",
    description: "کارت دسته‌بندی‌ها از کاتالوگ واقعی.",
    group: "کاتالوگ",
    fields: [...HEADING, { key: "limit", label: "تعداد", type: "number", min: 2, max: 12 }, ...CTA],
    defaults: { eyebrow: "دسته‌بندی‌ها", title: "از کجا شروع کنیم؟", limit: 3, ctaLabel: "همه دسته‌ها", ctaHref: "/categories" },
  },
  {
    type: "product_grid",
    label: "شبکه محصولات",
    description: "محصولات زنده با فیلتر دسته و مرتب‌سازی.",
    group: "کاتالوگ",
    fields: [
      ...HEADING,
      { key: "limit", label: "تعداد محصول", type: "number", min: 2, max: 12 },
      { key: "columns", label: "تعداد ستون", type: "select", options: [
        { value: "2", label: "۲ ستون" },
        { value: "3", label: "۳ ستون" },
        { value: "4", label: "۴ ستون" },
      ] },
      { key: "sort", label: "مرتب‌سازی", type: "select", options: SORTS },
      { key: "category", label: "اسلاگ دسته (اختیاری)", type: "text", placeholder: "women" },
      { key: "inStock", label: "فقط موجود", type: "boolean" },
      { key: "ctaHref", label: "لینک «مشاهده همه»", type: "text", placeholder: "/products" },
    ],
    defaults: { eyebrow: "کالکشن", title: "تازه‌های این هفته", limit: 4, columns: "4", sort: "newest", ctaHref: "/products" },
  },
  {
    type: "best_sellers",
    label: "پرفروش‌ترین‌ها",
    description: "محصولاتی که بیشترین فروش را داشته‌اند.",
    group: "کاتالوگ",
    fields: [...HEADING, { key: "limit", label: "تعداد", type: "number", min: 2, max: 12 }, ...CTA],
    defaults: { eyebrow: "انتخاب مشتریان", title: "پرفروش‌ترین‌ها", limit: 4, ctaHref: "/products" },
  },
  {
    type: "new_arrivals",
    label: "تازه‌ها",
    description: "آخرین محصولات اضافه‌شده.",
    group: "کاتالوگ",
    fields: [...HEADING, { key: "limit", label: "تعداد", type: "number", min: 2, max: 12 }, ...CTA],
    defaults: { eyebrow: "جدید", title: "تازه رسیده‌ها", limit: 4, ctaHref: "/products" },
  },
  {
    type: "product_carousel",
    label: "کاروسل محصولات",
    description: "ردیف افقی محصولات.",
    group: "کاتالوگ",
    fields: [...HEADING, { key: "limit", label: "تعداد", type: "number", min: 4, max: 16 }, { key: "sort", label: "مرتب‌سازی", type: "select", options: SORTS }],
    defaults: { eyebrow: "پیشنهاد سردبیر", title: "انتخاب‌های ما", limit: 8, sort: "best" },
  },
  {
    type: "promotional_banners",
    label: "بنر تبلیغاتی",
    description: "بنر بزرگ با تصویر و متن.",
    group: "بازاریابی",
    fields: [...HEADING, { key: "image", label: "تصویر", type: "image" }, ...CTA],
    defaults: { eyebrow: "تا ۳۰٪ تخفیف", title: "کالکشن پایان فصل", subtitle: "قطعات محدود با تخفیف ویژه تا پایان هفته.", image: "/media/hero/banner.jpg", ctaLabel: "خرید کنید", ctaHref: "/products" },
  },
  {
    type: "countdown",
    label: "شمارنده معکوس",
    description: "زمان‌دار برای کمپین‌ها.",
    group: "بازاریابی",
    fields: [
      { key: "title", label: "عنوان", type: "text" },
      { key: "until", label: "تاریخ پایان (ISO)", type: "text", placeholder: "2026-12-31T23:59:00Z" },
      { key: "ctaLabel", label: "متن دکمه", type: "text" },
      { key: "ctaHref", label: "لینک دکمه", type: "text" },
    ],
    defaults: { title: "پایان فروش ویژه", until: new Date(Date.now() + 3 * 864e5).toISOString(), ctaLabel: "همین حالا ببینید", ctaHref: "/products" },
  },
  {
    type: "image_text",
    label: "تصویر + متن",
    description: "دو ستون تصویر و متن برای معرفی.",
    group: "محتوا",
    fields: [...HEADING, { key: "body", label: "متن", type: "textarea" }, { key: "image", label: "تصویر", type: "image" }, { key: "align", label: "جای تصویر", type: "select", options: [
      { value: "image-left", label: "سمت راست (RTL)" },
      { value: "image-right", label: "سمت چپ" },
    ] }, ...CTA],
    defaults: { eyebrow: "درباره ما", title: "پارچه‌ای که نفس می‌کشد", body: "هر قطعه در تیراژ محدود و با پارچه‌های طبیعی تولید می‌شود.", image: "/media/hero/atelier-2.jpg", align: "image-left", ctaLabel: "بیشتر بخوانید", ctaHref: "/about" },
  },
  {
    type: "rich_text",
    label: "متن غنی",
    description: "عنوان و پاراگراف متنی.",
    group: "محتوا",
    fields: [...HEADING, { key: "body", label: "متن", type: "textarea" }],
    defaults: { eyebrow: "راهنما", title: "سایزبندی و نگهداری", body: "جدول سایز را بررسی کنید و لباس‌ها را با آب سرد بشویید." },
  },
  {
    type: "testimonials",
    label: "نظرات مشتریان",
    description: "نقل‌قول‌های مشتریان.",
    group: "محتوا",
    fields: [...HEADING],
    list: {
      key: "items",
      label: "نظرات",
      itemFields: [
        { key: "name", label: "نام", type: "text" },
        { key: "role", label: "شهر / نقش", type: "text" },
        { key: "quote", label: "متن", type: "textarea" },
      ],
      defaults: { name: "سارا", role: "تهران", quote: "کیفیت دوخت واقعاً بالاست." },
    },
    defaults: { title: "از زبان مشتریان", items: [] },
  },
  {
    type: "faq",
    label: "سؤالات پرتکرار",
    description: "آکاردئون پرسش و پاسخ.",
    group: "محتوا",
    fields: [...HEADING],
    list: {
      key: "items",
      label: "پرسش‌ها",
      itemFields: [
        { key: "question", label: "پرسش", type: "text" },
        { key: "answer", label: "پاسخ", type: "textarea" },
      ],
      defaults: { question: "ارسال چند روز طول می‌کشد؟", answer: "بین ۲ تا ۴ روز کاری در تهران." },
    },
    defaults: { title: "سؤالات پرتکرار", items: [] },
  },
  {
    type: "newsletter",
    label: "خبرنامه",
    description: "فرم عضویت در خبرنامه.",
    group: "بازاریابی",
    fields: [...HEADING],
    defaults: { eyebrow: "خبرنامه", title: "اول از همه خبردار شوید", subtitle: "کالکشن‌های جدید و پیشنهادهای ویژه، بدون اسپم." },
  },
  {
    type: "video",
    label: "ویدیو",
    description: "ویدیو معرفی با عنوان.",
    group: "محتوا",
    fields: [...HEADING, { key: "videoUrl", label: "لینک ویدیو", type: "text" }, { key: "poster", label: "تصویر کاور", type: "image" }],
    defaults: { title: "پشت صحنه تولید", videoUrl: "", poster: "/media/hero/atelier.jpg" },
  },
  {
    type: "brand_carousel",
    label: "برندها",
    description: "لوگو یا نام برندها.",
    group: "کاتالوگ",
    fields: [...HEADING],
    defaults: { title: "برندهای همکار" },
  },
];

export const schemaFor = (type: string) => SECTION_SCHEMAS.find((schema) => schema.type === type);
export const labelFor = (type: string) => schemaFor(type)?.label ?? type;

export const IMAGE_SUGGESTIONS = [
  "/media/hero/hero.jpg",
  "/media/hero/atelier.jpg",
  "/media/hero/banner.jpg",
  "/media/hero/atelier-2.jpg",
  "/media/categories/women.jpg",
  "/media/categories/men.jpg",
  "/media/categories/accessories.jpg",
  "/media/categories/outerwear.jpg",
  "/media/products/wool-coat.jpg",
  "/media/products/silk-dress.jpg",
];
