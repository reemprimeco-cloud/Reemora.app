/** Content for the homepage "Try it yourself" builder. One entry per
 *  business category, in both languages, so the mockup's menu, services,
 *  prices and calls to action match what the visitor picked. Prices are in
 *  KWD with three decimals. Icon keys map to lucide icons in the component. */

import type { Lang } from "@/lib/i18n/dictionaries";

export type ShowcaseGroup = "food" | "retail" | "services" | "education" | "digital";
export type PrimaryKind = "calendar" | "cart" | "order" | "stat" | "score" | "ticket";

export type ShowcaseItem = { icon: string; title: string; meta: string };
export type ShowcaseCategory = {
  id: string;
  group: ShowcaseGroup;
  label: string;
  /** Default business name, replaced by the visitor's own. */
  name: string;
  /** Small line above the name on the app header and website hero. */
  eyebrow: string;
  /** One-line promise under the name on the app header. */
  tagline: string;
  heroTitle: string;
  heroText: string;
  primary: { kind: PrimaryKind; title: string; text: string };
  items: readonly [ShowcaseItem, ShowcaseItem, ShowcaseItem];
  note: string;
  cta: string;
  nav: readonly [string, string, string];
};

export const SHOWCASE_GROUP_ORDER: readonly ShowcaseGroup[] = ["food", "retail", "services", "education", "digital"];

const en: ShowcaseCategory[] = [
  {
    id: "cafe", group: "food", label: "Café & coffee shop", name: "Bayt Coffee",
    eyebrow: "Good morning, Sara", tagline: "Order ahead · ready in 5 minutes",
    heroTitle: "Specialty coffee, roasted in Kuwait", heroText: "Order ahead, earn points on every cup and skip the line.",
    primary: { kind: "order", title: "Your usual: Flat white", text: "Ready at 8:15 AM · 1.500 KWD" },
    items: [
      { icon: "coffee", title: "Flat white", meta: "1.500 KWD" },
      { icon: "cup", title: "Iced Spanish latte", meta: "1.750 KWD" },
      { icon: "croissant", title: "Butter croissant", meta: "0.900 KWD" },
    ],
    note: "3 more cups for a free one", cta: "Order now", nav: ["Menu", "Rewards", "Locations"],
  },
  {
    id: "restaurant", group: "food", label: "Restaurant", name: "Dar Al Machboos",
    eyebrow: "Table for tonight?", tagline: "Reserve a table or order delivery",
    heroTitle: "Kuwaiti cuisine, made the slow way", heroText: "Book a table, order at home, or let us cater your event.",
    primary: { kind: "calendar", title: "Reserve a table", text: "Tonight 8:00 PM · 4 guests" },
    items: [
      { icon: "utensils", title: "Chicken machboos", meta: "3.500 KWD" },
      { icon: "soup", title: "Lamb quozi", meta: "6.000 KWD" },
      { icon: "cake", title: "Luqaimat", meta: "1.250 KWD" },
    ],
    note: "Delivery in 35 minutes", cta: "Reserve a table", nav: ["Menu", "Reserve", "Catering"],
  },
  {
    id: "bakery", group: "food", label: "Bakery & sweets", name: "Noor Bakery",
    eyebrow: "Fresh this morning", tagline: "Order cakes and daily bread",
    heroTitle: "Custom cakes for every occasion", heroText: "Birthday, wedding and corporate orders with 48 hours notice.",
    primary: { kind: "order", title: "Custom cake order", text: "Vanilla & pistachio · Saturday pickup" },
    items: [
      { icon: "cake", title: "Celebration cake", meta: "18.000 KWD" },
      { icon: "croissant", title: "Almond croissant box", meta: "4.500 KWD" },
      { icon: "cookie", title: "Date cookies", meta: "2.750 KWD" },
    ],
    note: "Pickup or delivery across Kuwait", cta: "Order a cake", nav: ["Cakes", "Daily bread", "Order"],
  },
  {
    id: "fashion", group: "retail", label: "Fashion boutique", name: "Dalal Boutique",
    eyebrow: "New collection", tagline: "Free delivery over 15.000 KWD",
    heroTitle: "Modest fashion with a modern cut", heroText: "Dresses, abayas and shirts, with new drops every week.",
    primary: { kind: "cart", title: "Your cart · 2 items", text: "Total 31.000 KWD" },
    items: [
      { icon: "dress", title: "Evening dress", meta: "19.000 KWD" },
      { icon: "shirt", title: "Linen shirt", meta: "12.000 KWD" },
      { icon: "scarf", title: "Silk scarf", meta: "6.500 KWD" },
    ],
    note: "KNET · Apple Pay · easy returns", cta: "Checkout", nav: ["New in", "Dresses", "Sale"],
  },
  {
    id: "perfume", group: "retail", label: "Perfume & cosmetics", name: "Oud & Rose",
    eyebrow: "Bestsellers", tagline: "Perfumes, oud and skincare",
    heroTitle: "Scents that stay with you", heroText: "Niche perfumes, oud and skincare with same-day delivery.",
    primary: { kind: "cart", title: "Your cart · 1 item", text: "Total 24.000 KWD" },
    items: [
      { icon: "spray", title: "Royal oud 50ml", meta: "24.000 KWD" },
      { icon: "sparkles", title: "Rose musk", meta: "14.500 KWD" },
      { icon: "droplets", title: "Vitamin C serum", meta: "9.000 KWD" },
    ],
    note: "Free samples with every order", cta: "Checkout", nav: ["Perfume", "Oud", "Skincare"],
  },
  {
    id: "jewelry", group: "retail", label: "Jewelry", name: "Lulu Jewels",
    eyebrow: "Handcrafted", tagline: "Gold, pearls and custom pieces",
    heroTitle: "Jewelry made for your story", heroText: "18k gold and Gulf pearls, with engraving on request.",
    primary: { kind: "order", title: "Custom engraving", text: "Name necklace · ready in 5 days" },
    items: [
      { icon: "gem", title: "Pearl necklace", meta: "85.000 KWD" },
      { icon: "watch", title: "Gold bracelet", meta: "120.000 KWD" },
      { icon: "gift", title: "Gift box set", meta: "35.000 KWD" },
    ],
    note: "Certified gold · insured delivery", cta: "Shop now", nav: ["Necklaces", "Bracelets", "Custom"],
  },
  {
    id: "electronics", group: "retail", label: "Electronics store", name: "Volt Store",
    eyebrow: "Deals this week", tagline: "Phones, laptops and accessories",
    heroTitle: "Tech, delivered today", heroText: "The latest phones and laptops with 0% installments.",
    primary: { kind: "cart", title: "Your cart · 1 item", text: "Total 289.000 KWD" },
    items: [
      { icon: "smartphone", title: "Smartphone 256GB", meta: "289.000 KWD" },
      { icon: "laptop", title: "Ultrabook 14\"", meta: "349.000 KWD" },
      { icon: "headphones", title: "Wireless earbuds", meta: "39.000 KWD" },
    ],
    note: "2-year warranty · installments", cta: "Checkout", nav: ["Phones", "Laptops", "Deals"],
  },
  {
    id: "grocery", group: "retail", label: "Grocery & supermarket", name: "Fresh Basket",
    eyebrow: "Delivery in 45 minutes", tagline: "Fresh groceries to your door",
    heroTitle: "Groceries in under an hour", heroText: "Fresh produce, bakery and household essentials in scheduled slots.",
    primary: { kind: "cart", title: "Your basket · 12 items", text: "Total 18.250 KWD" },
    items: [
      { icon: "apple", title: "Organic apples 1kg", meta: "1.250 KWD" },
      { icon: "milk", title: "Fresh milk 2L", meta: "0.950 KWD" },
      { icon: "basket", title: "Weekly essentials box", meta: "9.500 KWD" },
    ],
    note: "Next slot: today 6–7 PM", cta: "Checkout", nav: ["Fresh", "Pantry", "Offers"],
  },
  {
    id: "flowers", group: "retail", label: "Flower shop", name: "Yasmin Flowers",
    eyebrow: "Same-day delivery", tagline: "Bouquets for every occasion",
    heroTitle: "Fresh flowers, delivered with a note", heroText: "Weddings, birthdays and graduations, same day across Kuwait.",
    primary: { kind: "order", title: "Deliver today", text: "Mishref · 4–6 PM · with card" },
    items: [
      { icon: "flower", title: "Rose bouquet", meta: "12.000 KWD" },
      { icon: "leaf", title: "Orchid arrangement", meta: "22.000 KWD" },
      { icon: "gift", title: "Flowers & chocolate box", meta: "18.000 KWD" },
    ],
    note: "Add a handwritten card", cta: "Send flowers", nav: ["Bouquets", "Occasions", "Order"],
  },
  {
    id: "salon", group: "services", label: "Spa & beauty salon", name: "Glow Spa & Salon",
    eyebrow: "Good morning, Dana", tagline: "Book hair, nails and spa",
    heroTitle: "Your appointment, in three taps", heroText: "Hair, nails, skin and spa, with the specialist you choose.",
    primary: { kind: "calendar", title: "Next appointment", text: "Hair treatment · Today 5:30 PM" },
    items: [
      { icon: "scissors", title: "Haircut & blow-dry", meta: "15.000 KWD" },
      { icon: "hand", title: "Gel manicure", meta: "8.000 KWD" },
      { icon: "sparkles", title: "Moroccan bath", meta: "20.000 KWD" },
    ],
    note: "Reminder sent on WhatsApp", cta: "Book now", nav: ["Services", "Book", "Offers"],
  },
  {
    id: "barber", group: "services", label: "Barber shop", name: "The Barber Club",
    eyebrow: "Walk-ins & bookings", tagline: "Cuts, beards and hot towel shaves",
    heroTitle: "Look sharp. Book in seconds.", heroText: "Pick your barber and your time, no waiting.",
    primary: { kind: "calendar", title: "Your chair is ready", text: "Ahmad · Thursday 7:00 PM" },
    items: [
      { icon: "scissors", title: "Classic cut", meta: "6.000 KWD" },
      { icon: "sparkles", title: "Beard trim & shape", meta: "4.000 KWD" },
      { icon: "droplets", title: "Hot towel shave", meta: "5.000 KWD" },
    ],
    note: "Loyalty: 10th cut is free", cta: "Book a chair", nav: ["Barbers", "Book", "Prices"],
  },
  {
    id: "gym", group: "services", label: "Gym & fitness studio", name: "Pulse Fitness",
    eyebrow: "This week", tagline: "Classes, personal training and memberships",
    heroTitle: "Train with a plan", heroText: "Group classes, personal training and flexible memberships.",
    primary: { kind: "calendar", title: "Next class", text: "HIIT · Sunday 6:30 PM · 4 spots" },
    items: [
      { icon: "dumbbell", title: "Strength basics", meta: "Mon · Wed" },
      { icon: "heart", title: "Spin 45", meta: "Tue · Thu" },
      { icon: "sparkles", title: "Pilates", meta: "Sat" },
    ],
    note: "Membership renews 1 November", cta: "Book a class", nav: ["Classes", "Membership", "Trainers"],
  },
  {
    id: "clinic", group: "services", label: "Clinic & dental", name: "Nour Clinic",
    eyebrow: "Welcome back", tagline: "Book doctors and dentists",
    heroTitle: "Care that fits your schedule", heroText: "Dental, dermatology and family medicine with online booking.",
    primary: { kind: "calendar", title: "Upcoming visit", text: "Dr. Huda · Dental · Tuesday 10:30 AM" },
    items: [
      { icon: "stethoscope", title: "General check-up", meta: "15.000 KWD" },
      { icon: "smile", title: "Teeth cleaning", meta: "25.000 KWD" },
      { icon: "heart", title: "Skin consultation", meta: "20.000 KWD" },
    ],
    note: "Results sent to your phone", cta: "Book a visit", nav: ["Doctors", "Services", "Book"],
  },
  {
    id: "carwash", group: "services", label: "Car wash & detailing", name: "Shine Auto Spa",
    eyebrow: "We come to you", tagline: "Mobile wash and detailing",
    heroTitle: "A showroom shine, at your door", heroText: "Mobile car wash and detailing anywhere in Kuwait.",
    primary: { kind: "calendar", title: "Next wash", text: "Salmiya · Friday 10:00 AM" },
    items: [
      { icon: "car", title: "Exterior wash", meta: "4.000 KWD" },
      { icon: "droplets", title: "Full detailing", meta: "25.000 KWD" },
      { icon: "sparkles", title: "Ceramic coating", meta: "120.000 KWD" },
    ],
    note: "Subscribe: 4 washes a month", cta: "Book a wash", nav: ["Services", "Book", "Plans"],
  },
  {
    id: "photography", group: "services", label: "Photography studio", name: "Lens Studio",
    eyebrow: "Portfolio", tagline: "Weddings, events and portraits",
    heroTitle: "Moments, beautifully kept", heroText: "Weddings, events, products and portraits.",
    primary: { kind: "calendar", title: "Session booked", text: "Engagement shoot · Saturday 4:00 PM" },
    items: [
      { icon: "camera", title: "Wedding package", meta: "450.000 KWD" },
      { icon: "image", title: "Portrait session", meta: "60.000 KWD" },
      { icon: "sparkles", title: "Product photography", meta: "120.000 KWD" },
    ],
    note: "Gallery delivered in 7 days", cta: "Book a session", nav: ["Portfolio", "Packages", "Book"],
  },
  {
    id: "realestate", group: "services", label: "Real estate", name: "Dar Properties",
    eyebrow: "New listings", tagline: "Apartments, villas and offices",
    heroTitle: "Find your next home in Kuwait", heroText: "Verified listings with virtual tours and viewings on WhatsApp.",
    primary: { kind: "stat", title: "24 new listings", text: "Salmiya · Jabriya · Sabah Al Salem" },
    items: [
      { icon: "home", title: "2BR apartment · Salmiya", meta: "650 KWD/mo" },
      { icon: "building", title: "Villa · Jabriya", meta: "1,800 KWD/mo" },
      { icon: "key", title: "Office · Kuwait City", meta: "950 KWD/mo" },
    ],
    note: "Book a viewing on WhatsApp", cta: "Browse listings", nav: ["Rent", "Buy", "Agents"],
  },
  {
    id: "cleaning", group: "services", label: "Cleaning services", name: "Sparkle Home",
    eyebrow: "Book by the hour", tagline: "Home and office cleaning",
    heroTitle: "A clean home, on schedule", heroText: "Trained teams on hourly or weekly plans.",
    primary: { kind: "calendar", title: "Next visit", text: "Weekly · Wednesday 9:00 AM · 3 hours" },
    items: [
      { icon: "sparkles", title: "Deep cleaning", meta: "25.000 KWD" },
      { icon: "home", title: "Weekly plan", meta: "60.000 KWD/mo" },
      { icon: "droplets", title: "Sofa & carpet", meta: "18.000 KWD" },
    ],
    note: "Same team every visit", cta: "Book a cleaner", nav: ["Services", "Plans", "Book"],
  },
  {
    id: "training", group: "education", label: "Training center", name: "Skill Lab",
    eyebrow: "Enrolling now", tagline: "Courses, cohorts and certificates",
    heroTitle: "Learn skills that get you hired", heroText: "Evening cohorts with certificates and real projects.",
    primary: { kind: "calendar", title: "Next cohort", text: "AI App Bootcamp · starts 2 November" },
    items: [
      { icon: "graduation", title: "AI App Bootcamp", meta: "450.000 KWD" },
      { icon: "book", title: "Prompt Engineering", meta: "220.000 KWD" },
      { icon: "pen", title: "UX Design Basics", meta: "180.000 KWD" },
    ],
    note: "KNET · installments available", cta: "Enroll", nav: ["Courses", "Schedule", "Enroll"],
  },
  {
    id: "blog", group: "education", label: "Personal blog", name: "Noura's Notes",
    eyebrow: "Latest post", tagline: "Stories, ideas and a newsletter",
    heroTitle: "What I learned building my first app with AI", heroText: "5 min read · Kuwait City",
    primary: { kind: "stat", title: "1,200 readers", text: "New post every Sunday" },
    items: [
      { icon: "pen", title: "Morning routines that stick", meta: "3 min" },
      { icon: "book", title: "My favourite AI tools", meta: "6 min" },
      { icon: "map", title: "A weekend in Failaka", meta: "4 min" },
    ],
    note: "Subscribe to the Sunday letter", cta: "Read the story", nav: ["Articles", "About", "Subscribe"],
  },
  {
    id: "magazine", group: "education", label: "Online magazine", name: "Deera Magazine",
    eyebrow: "Issue 12 · October", tagline: "Culture, business and food",
    heroTitle: "The new makers of Kuwait", heroText: "12 founders, designers and chefs shaping the city.",
    primary: { kind: "stat", title: "3 new stories", text: "1 audio · 8 min cover story" },
    items: [
      { icon: "newspaper", title: "Inside a ceramics studio", meta: "Culture" },
      { icon: "mic", title: "A café chain goes cashless", meta: "Business" },
      { icon: "utensils", title: "Best machboos in town", meta: "Food" },
    ],
    note: "Saved to read offline", cta: "Read the issue", nav: ["Culture", "Business", "Food"],
  },
  {
    id: "events", group: "education", label: "Events & tickets", name: "Diwan Events",
    eyebrow: "This month", tagline: "Tickets and registrations",
    heroTitle: "Kuwait's best nights, one ticket away", heroText: "Concerts, talks and workshops with e-tickets.",
    primary: { kind: "ticket", title: "2 tickets", text: "Startup Night · Thursday 7 PM · Row C" },
    items: [
      { icon: "music", title: "Oud Night", meta: "8.000 KWD" },
      { icon: "mic", title: "Founders Talk", meta: "Free" },
      { icon: "ticket", title: "Design Workshop", meta: "25.000 KWD" },
    ],
    note: "QR ticket on your phone", cta: "Get tickets", nav: ["Events", "Tickets", "Venues"],
  },
  {
    id: "game", group: "digital", label: "Game", name: "Diwaniya Quiz",
    eyebrow: "Level 7 · 2,340 pts", tagline: "Kuwait trivia with friends",
    heroTitle: "Beat your friends in Kuwait trivia", heroText: "Daily challenges, leaderboards and weekly prizes.",
    primary: { kind: "score", title: "Daily challenge", text: "5 questions · 2× points until midnight" },
    items: [
      { icon: "trophy", title: "Sara K.", meta: "3,120" },
      { icon: "star", title: "Yousef A.", meta: "2,980" },
      { icon: "gamepad", title: "You", meta: "2,340" },
    ],
    note: "Weekly prize: 10.000 KWD voucher", cta: "Play now", nav: ["Play", "Leaderboard", "Prizes"],
  },
];

const ar: ShowcaseCategory[] = [
  {
    id: "cafe", group: "food", label: "مقهى وقهوة مختصة", name: "بيت القهوة",
    eyebrow: "صباح الخير يا سارة", tagline: "اطلب مسبقاً · جاهز خلال 5 دقائق",
    heroTitle: "قهوة مختصة محمّصة في الكويت", heroText: "اطلب مسبقاً، اكسب نقاطاً مع كل كوب، وتخطَّ الطابور.",
    primary: { kind: "order", title: "طلبك المعتاد: فلات وايت", text: "جاهز الساعة 8:15 ص · 1.500 د.ك" },
    items: [
      { icon: "coffee", title: "فلات وايت", meta: "1.500 د.ك" },
      { icon: "cup", title: "سبانيش لاتيه مثلج", meta: "1.750 د.ك" },
      { icon: "croissant", title: "كرواسون بالزبدة", meta: "0.900 د.ك" },
    ],
    note: "3 أكواب أخرى وتحصل على كوب مجاني", cta: "اطلب الآن", nav: ["القائمة", "المكافآت", "الفروع"],
  },
  {
    id: "restaurant", group: "food", label: "مطعم", name: "دار المجبوس",
    eyebrow: "طاولة الليلة؟", tagline: "احجز طاولة أو اطلب توصيلاً",
    heroTitle: "مطبخ كويتي يُطهى على مهل", heroText: "احجز طاولة، اطلب للمنزل، أو دعنا نجهّز مناسبتك.",
    primary: { kind: "calendar", title: "حجز طاولة", text: "الليلة 8:00 م · 4 أشخاص" },
    items: [
      { icon: "utensils", title: "مجبوس دجاج", meta: "3.500 د.ك" },
      { icon: "soup", title: "قوزي لحم", meta: "6.000 د.ك" },
      { icon: "cake", title: "لقيمات", meta: "1.250 د.ك" },
    ],
    note: "التوصيل خلال 35 دقيقة", cta: "احجز طاولة", nav: ["القائمة", "الحجز", "الضيافة"],
  },
  {
    id: "bakery", group: "food", label: "مخبز وحلويات", name: "مخبز نور",
    eyebrow: "طازج هذا الصباح", tagline: "اطلب الكيك والخبز اليومي",
    heroTitle: "كيك مخصص لكل مناسبة", heroText: "طلبات أعياد الميلاد والأعراس والشركات قبل 48 ساعة.",
    primary: { kind: "order", title: "طلب كيك مخصص", text: "فانيلا وفستق · استلام السبت" },
    items: [
      { icon: "cake", title: "كيكة احتفال", meta: "18.000 د.ك" },
      { icon: "croissant", title: "علبة كرواسون باللوز", meta: "4.500 د.ك" },
      { icon: "cookie", title: "كوكيز بالتمر", meta: "2.750 د.ك" },
    ],
    note: "استلام أو توصيل لكل مناطق الكويت", cta: "اطلب كيكة", nav: ["الكيك", "الخبز اليومي", "اطلب"],
  },
  {
    id: "fashion", group: "retail", label: "بوتيك أزياء", name: "بوتيك دلال",
    eyebrow: "التشكيلة الجديدة", tagline: "توصيل مجاني للطلبات فوق 15.000 د.ك",
    heroTitle: "أزياء محتشمة بقصّة عصرية", heroText: "فساتين وعبايات وقمصان، مع إصدارات جديدة كل أسبوع.",
    primary: { kind: "cart", title: "سلتك · قطعتان", text: "الإجمالي 31.000 د.ك" },
    items: [
      { icon: "dress", title: "فستان سهرة", meta: "19.000 د.ك" },
      { icon: "shirt", title: "قميص كتان", meta: "12.000 د.ك" },
      { icon: "scarf", title: "وشاح حرير", meta: "6.500 د.ك" },
    ],
    note: "كي نت · آبل باي · إرجاع سهل", cta: "إتمام الشراء", nav: ["وصل حديثاً", "الفساتين", "التخفيضات"],
  },
  {
    id: "perfume", group: "retail", label: "عطور ومستحضرات تجميل", name: "عود وورد",
    eyebrow: "الأكثر مبيعاً", tagline: "عطور وعود وعناية بالبشرة",
    heroTitle: "روائح تبقى معك", heroText: "عطور نيش وعود وعناية بالبشرة مع توصيل في اليوم نفسه.",
    primary: { kind: "cart", title: "سلتك · قطعة واحدة", text: "الإجمالي 24.000 د.ك" },
    items: [
      { icon: "spray", title: "عود ملكي 50 مل", meta: "24.000 د.ك" },
      { icon: "sparkles", title: "مسك الورد", meta: "14.500 د.ك" },
      { icon: "droplets", title: "سيروم فيتامين سي", meta: "9.000 د.ك" },
    ],
    note: "عينات مجانية مع كل طلب", cta: "إتمام الشراء", nav: ["العطور", "العود", "العناية"],
  },
  {
    id: "jewelry", group: "retail", label: "مجوهرات", name: "مجوهرات لولو",
    eyebrow: "صناعة يدوية", tagline: "ذهب ولؤلؤ وقطع مخصصة",
    heroTitle: "مجوهرات تروي حكايتك", heroText: "ذهب عيار 18 ولؤلؤ خليجي، مع إمكانية النقش.",
    primary: { kind: "order", title: "نقش مخصص", text: "قلادة بالاسم · جاهزة خلال 5 أيام" },
    items: [
      { icon: "gem", title: "عقد لؤلؤ", meta: "85.000 د.ك" },
      { icon: "watch", title: "سوار ذهب", meta: "120.000 د.ك" },
      { icon: "gift", title: "طقم علبة هدية", meta: "35.000 د.ك" },
    ],
    note: "ذهب معتمد · توصيل مؤمَّن", cta: "تسوّق الآن", nav: ["القلائد", "الأساور", "تصميم خاص"],
  },
  {
    id: "electronics", group: "retail", label: "متجر إلكترونيات", name: "فولت ستور",
    eyebrow: "عروض الأسبوع", tagline: "هواتف وحواسيب وإكسسوارات",
    heroTitle: "تقنية تصلك اليوم", heroText: "أحدث الهواتف والحواسيب مع تقسيط بدون فوائد.",
    primary: { kind: "cart", title: "سلتك · قطعة واحدة", text: "الإجمالي 289.000 د.ك" },
    items: [
      { icon: "smartphone", title: "هاتف ذكي 256 جيجا", meta: "289.000 د.ك" },
      { icon: "laptop", title: "لابتوب 14 بوصة", meta: "349.000 د.ك" },
      { icon: "headphones", title: "سماعات لاسلكية", meta: "39.000 د.ك" },
    ],
    note: "ضمان سنتان · تقسيط", cta: "إتمام الشراء", nav: ["الهواتف", "الحواسيب", "العروض"],
  },
  {
    id: "grocery", group: "retail", label: "بقالة وسوبرماركت", name: "فريش باسكت",
    eyebrow: "توصيل خلال 45 دقيقة", tagline: "مقاضي طازجة إلى بابك",
    heroTitle: "مقاضيك خلال أقل من ساعة", heroText: "خضار وفواكه ومخبوزات ومستلزمات المنزل في مواعيد تختارها.",
    primary: { kind: "cart", title: "سلتك · 12 صنفاً", text: "الإجمالي 18.250 د.ك" },
    items: [
      { icon: "apple", title: "تفاح عضوي 1 كجم", meta: "1.250 د.ك" },
      { icon: "milk", title: "حليب طازج 2 لتر", meta: "0.950 د.ك" },
      { icon: "basket", title: "صندوق الأساسيات الأسبوعي", meta: "9.500 د.ك" },
    ],
    note: "الموعد القادم: اليوم 6–7 م", cta: "إتمام الشراء", nav: ["الطازج", "المؤن", "العروض"],
  },
  {
    id: "flowers", group: "retail", label: "محل زهور", name: "زهور ياسمين",
    eyebrow: "توصيل في اليوم نفسه", tagline: "باقات لكل مناسبة",
    heroTitle: "زهور طازجة تصل مع بطاقة", heroText: "أعراس وأعياد ميلاد وتخرّج، في اليوم نفسه بكل الكويت.",
    primary: { kind: "order", title: "توصيل اليوم", text: "مشرف · 4–6 م · مع بطاقة" },
    items: [
      { icon: "flower", title: "باقة ورد", meta: "12.000 د.ك" },
      { icon: "leaf", title: "تنسيق أوركيد", meta: "22.000 د.ك" },
      { icon: "gift", title: "زهور وعلبة شوكولاتة", meta: "18.000 د.ك" },
    ],
    note: "أضف بطاقة بخط اليد", cta: "أرسل زهوراً", nav: ["الباقات", "المناسبات", "اطلب"],
  },
  {
    id: "salon", group: "services", label: "سبا وصالون تجميل", name: "جلو سبا وصالون",
    eyebrow: "صباح الخير يا دانة", tagline: "احجزي الشعر والأظافر والسبا",
    heroTitle: "موعدك بثلاث نقرات", heroText: "شعر وأظافر وبشرة وسبا، مع المختصة التي تختارينها.",
    primary: { kind: "calendar", title: "الموعد القادم", text: "علاج شعر · اليوم 5:30 م" },
    items: [
      { icon: "scissors", title: "قص وسشوار", meta: "15.000 د.ك" },
      { icon: "hand", title: "مناكير جل", meta: "8.000 د.ك" },
      { icon: "sparkles", title: "حمام مغربي", meta: "20.000 د.ك" },
    ],
    note: "أُرسل التذكير على واتساب", cta: "احجزي الآن", nav: ["الخدمات", "الحجز", "العروض"],
  },
  {
    id: "barber", group: "services", label: "صالون حلاقة رجالي", name: "نادي الحلاقة",
    eyebrow: "حضور مباشر أو حجز", tagline: "قص ولحية وحلاقة بالمنشفة الساخنة",
    heroTitle: "مظهر أنيق. حجز بثوانٍ.", heroText: "اختر حلاقك ووقتك، بلا انتظار.",
    primary: { kind: "calendar", title: "كرسيك جاهز", text: "أحمد · الخميس 7:00 م" },
    items: [
      { icon: "scissors", title: "قصة كلاسيكية", meta: "6.000 د.ك" },
      { icon: "sparkles", title: "تشذيب وتحديد اللحية", meta: "4.000 د.ك" },
      { icon: "droplets", title: "حلاقة بالمنشفة الساخنة", meta: "5.000 د.ك" },
    ],
    note: "الولاء: القصة العاشرة مجاناً", cta: "احجز كرسياً", nav: ["الحلاقون", "الحجز", "الأسعار"],
  },
  {
    id: "gym", group: "services", label: "نادي رياضي ولياقة", name: "بلس فتنس",
    eyebrow: "هذا الأسبوع", tagline: "حصص وتدريب شخصي واشتراكات",
    heroTitle: "تدرّب بخطة", heroText: "حصص جماعية وتدريب شخصي واشتراكات مرنة.",
    primary: { kind: "calendar", title: "الحصة القادمة", text: "HIIT · الأحد 6:30 م · 4 مقاعد" },
    items: [
      { icon: "dumbbell", title: "أساسيات القوة", meta: "الاثنين · الأربعاء" },
      { icon: "heart", title: "سبين 45", meta: "الثلاثاء · الخميس" },
      { icon: "sparkles", title: "بيلاتس", meta: "السبت" },
    ],
    note: "يتجدد الاشتراك في 1 نوفمبر", cta: "احجز حصة", nav: ["الحصص", "الاشتراك", "المدربون"],
  },
  {
    id: "clinic", group: "services", label: "عيادة وأسنان", name: "عيادة نور",
    eyebrow: "أهلاً بعودتك", tagline: "احجز مع الأطباء وأطباء الأسنان",
    heroTitle: "رعاية تناسب جدولك", heroText: "أسنان وجلدية وطب أسرة مع حجز إلكتروني.",
    primary: { kind: "calendar", title: "الزيارة القادمة", text: "د. هدى · أسنان · الثلاثاء 10:30 ص" },
    items: [
      { icon: "stethoscope", title: "فحص عام", meta: "15.000 د.ك" },
      { icon: "smile", title: "تنظيف الأسنان", meta: "25.000 د.ك" },
      { icon: "heart", title: "استشارة جلدية", meta: "20.000 د.ك" },
    ],
    note: "تصلك النتائج على هاتفك", cta: "احجز زيارة", nav: ["الأطباء", "الخدمات", "الحجز"],
  },
  {
    id: "carwash", group: "services", label: "غسيل وتلميع سيارات", name: "شاين أوتو سبا",
    eyebrow: "نأتي إليك", tagline: "غسيل وتلميع متنقل",
    heroTitle: "لمعة المعرض عند بابك", heroText: "غسيل وتلميع سيارات متنقل في كل الكويت.",
    primary: { kind: "calendar", title: "الغسلة القادمة", text: "السالمية · الجمعة 10:00 ص" },
    items: [
      { icon: "car", title: "غسيل خارجي", meta: "4.000 د.ك" },
      { icon: "droplets", title: "تلميع كامل", meta: "25.000 د.ك" },
      { icon: "sparkles", title: "طبقة سيراميك", meta: "120.000 د.ك" },
    ],
    note: "اشترك: 4 غسلات شهرياً", cta: "احجز غسلة", nav: ["الخدمات", "الحجز", "الباقات"],
  },
  {
    id: "photography", group: "services", label: "استوديو تصوير", name: "استوديو لنز",
    eyebrow: "أعمالنا", tagline: "أعراس وفعاليات وبورتريه",
    heroTitle: "لحظات محفوظة بجمال", heroText: "أعراس وفعاليات ومنتجات وبورتريه.",
    primary: { kind: "calendar", title: "جلسة محجوزة", text: "تصوير خطوبة · السبت 4:00 م" },
    items: [
      { icon: "camera", title: "باقة العرس", meta: "450.000 د.ك" },
      { icon: "image", title: "جلسة بورتريه", meta: "60.000 د.ك" },
      { icon: "sparkles", title: "تصوير منتجات", meta: "120.000 د.ك" },
    ],
    note: "تسليم الألبوم خلال 7 أيام", cta: "احجز جلسة", nav: ["الأعمال", "الباقات", "الحجز"],
  },
  {
    id: "realestate", group: "services", label: "عقارات", name: "دار العقارية",
    eyebrow: "عروض جديدة", tagline: "شقق وفلل ومكاتب",
    heroTitle: "ابحث عن بيتك القادم في الكويت", heroText: "عروض موثقة مع جولات افتراضية ومعاينة عبر واتساب.",
    primary: { kind: "stat", title: "24 عرضاً جديداً", text: "السالمية · الجابرية · صباح السالم" },
    items: [
      { icon: "home", title: "شقة غرفتين · السالمية", meta: "650 د.ك/شهر" },
      { icon: "building", title: "فيلا · الجابرية", meta: "1,800 د.ك/شهر" },
      { icon: "key", title: "مكتب · مدينة الكويت", meta: "950 د.ك/شهر" },
    ],
    note: "احجز معاينة عبر واتساب", cta: "تصفح العروض", nav: ["إيجار", "بيع", "الوكلاء"],
  },
  {
    id: "cleaning", group: "services", label: "خدمات تنظيف", name: "سباركل هوم",
    eyebrow: "احجز بالساعة", tagline: "تنظيف منازل ومكاتب",
    heroTitle: "بيت نظيف في موعده", heroText: "فرق مدرّبة بباقات بالساعة أو أسبوعية.",
    primary: { kind: "calendar", title: "الزيارة القادمة", text: "أسبوعياً · الأربعاء 9:00 ص · 3 ساعات" },
    items: [
      { icon: "sparkles", title: "تنظيف عميق", meta: "25.000 د.ك" },
      { icon: "home", title: "باقة أسبوعية", meta: "60.000 د.ك/شهر" },
      { icon: "droplets", title: "كنب وسجاد", meta: "18.000 د.ك" },
    ],
    note: "الفريق نفسه في كل زيارة", cta: "احجز منظفاً", nav: ["الخدمات", "الباقات", "الحجز"],
  },
  {
    id: "training", group: "education", label: "مركز تدريب", name: "سكل لاب",
    eyebrow: "التسجيل مفتوح", tagline: "دورات ودُفعات وشهادات",
    heroTitle: "تعلّم مهارات توظّفك", heroText: "دُفعات مسائية بشهادات ومشاريع حقيقية.",
    primary: { kind: "calendar", title: "الدفعة القادمة", text: "معسكر تطبيقات الذكاء الاصطناعي · يبدأ 2 نوفمبر" },
    items: [
      { icon: "graduation", title: "معسكر تطبيقات الذكاء الاصطناعي", meta: "450.000 د.ك" },
      { icon: "book", title: "هندسة الأوامر", meta: "220.000 د.ك" },
      { icon: "pen", title: "أساسيات تصميم التجربة", meta: "180.000 د.ك" },
    ],
    note: "كي نت · تقسيط متاح", cta: "سجّل الآن", nav: ["الدورات", "الجدول", "التسجيل"],
  },
  {
    id: "blog", group: "education", label: "مدونة شخصية", name: "دفتر نورة",
    eyebrow: "آخر مقال", tagline: "قصص وأفكار ونشرة بريدية",
    heroTitle: "ماذا تعلّمت من بناء أول تطبيق لي بالذكاء الاصطناعي", heroText: "قراءة 5 دقائق · مدينة الكويت",
    primary: { kind: "stat", title: "1,200 قارئ", text: "مقال جديد كل أحد" },
    items: [
      { icon: "pen", title: "روتين صباحي يدوم", meta: "3 دقائق" },
      { icon: "book", title: "أدواتي المفضلة في الذكاء الاصطناعي", meta: "6 دقائق" },
      { icon: "map", title: "نهاية أسبوع في فيلكا", meta: "4 دقائق" },
    ],
    note: "اشترك في رسالة الأحد", cta: "اقرأ القصة", nav: ["المقالات", "عنّي", "اشترك"],
  },
  {
    id: "magazine", group: "education", label: "مجلة إلكترونية", name: "مجلة ديرة",
    eyebrow: "العدد 12 · أكتوبر", tagline: "ثقافة وأعمال وطعام",
    heroTitle: "صنّاع الكويت الجدد", heroText: "12 مؤسساً ومصمماً وطاهياً يشكّلون المدينة.",
    primary: { kind: "stat", title: "3 قصص جديدة", text: "مقطع صوتي · قصة غلاف 8 دقائق" },
    items: [
      { icon: "newspaper", title: "داخل استوديو خزف", meta: "ثقافة" },
      { icon: "mic", title: "سلسلة مقاهٍ بلا نقد", meta: "أعمال" },
      { icon: "utensils", title: "أفضل مجبوس في المدينة", meta: "طعام" },
    ],
    note: "محفوظ للقراءة دون إنترنت", cta: "اقرأ العدد", nav: ["ثقافة", "أعمال", "طعام"],
  },
  {
    id: "events", group: "education", label: "فعاليات وتذاكر", name: "ديوان للفعاليات",
    eyebrow: "هذا الشهر", tagline: "تذاكر وتسجيلات",
    heroTitle: "أجمل ليالي الكويت على بُعد تذكرة", heroText: "حفلات وندوات وورش عمل بتذاكر إلكترونية.",
    primary: { kind: "ticket", title: "تذكرتان", text: "ليلة الشركات الناشئة · الخميس 7 م · الصف C" },
    items: [
      { icon: "music", title: "ليلة العود", meta: "8.000 د.ك" },
      { icon: "mic", title: "حديث المؤسسين", meta: "مجاناً" },
      { icon: "ticket", title: "ورشة التصميم", meta: "25.000 د.ك" },
    ],
    note: "تذكرة QR على هاتفك", cta: "احصل على التذاكر", nav: ["الفعاليات", "التذاكر", "الأماكن"],
  },
  {
    id: "game", group: "digital", label: "لعبة", name: "تحدي الديوانية",
    eyebrow: "المرحلة 7 · 2,340 نقطة", tagline: "معلومات عن الكويت مع الأصدقاء",
    heroTitle: "تحدَّ أصدقاءك في معلومات الكويت", heroText: "تحديات يومية ولوحات صدارة وجوائز أسبوعية.",
    primary: { kind: "score", title: "تحدي اليوم", text: "5 أسئلة · نقاط مضاعفة حتى منتصف الليل" },
    items: [
      { icon: "trophy", title: "سارة ك.", meta: "3,120" },
      { icon: "star", title: "يوسف أ.", meta: "2,980" },
      { icon: "gamepad", title: "أنت", meta: "2,340" },
    ],
    note: "جائزة الأسبوع: قسيمة بقيمة 10.000 د.ك", cta: "العب الآن", nav: ["العب", "الصدارة", "الجوائز"],
  },
];

export const SHOWCASE_CATALOG: Record<Lang, readonly ShowcaseCategory[]> = { en, ar };

/** Brand colors offered in the picker. All are dark enough for white text. */
export const SHOWCASE_COLORS: readonly { id: string; hex: string }[] = [
  { id: "navy", hex: "#1b2a4a" },
  { id: "blue", hex: "#2f6fcb" },
  { id: "emerald", hex: "#0f8a5f" },
  { id: "teal", hex: "#0f7f8c" },
  { id: "purple", hex: "#6b3fd1" },
  { id: "rose", hex: "#c6336b" },
  { id: "amber", hex: "#b45f06" },
  { id: "charcoal", hex: "#222831" },
];
