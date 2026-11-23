export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export const DEFAULT_CURRENCY = "USD";

/** Labels only. Amounts are never converted between these. */
export const CURRENCIES: readonly Currency[] = [
  { code: "AED", name: "UAE dirham", symbol: "د.إ" },
  { code: "AFN", name: "Afghan afghani", symbol: "؋" },
  { code: "ALL", name: "Albanian lek", symbol: "L" },
  { code: "AMD", name: "Armenian dram", symbol: "֏" },
  { code: "ANG", name: "Netherlands Antillean guilder", symbol: "ƒ" },
  { code: "AOA", name: "Angolan kwanza", symbol: "Kz" },
  { code: "ARS", name: "Argentine peso", symbol: "AR$" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
  { code: "AWG", name: "Aruban florin", symbol: "ƒ" },
  { code: "AZN", name: "Azerbaijani manat", symbol: "₼" },
  { code: "BAM", name: "Bosnia-Herzegovina mark", symbol: "KM" },
  { code: "BBD", name: "Barbadian dollar", symbol: "Bds$" },
  { code: "BDT", name: "Bangladeshi taka", symbol: "৳" },
  { code: "BGN", name: "Bulgarian lev", symbol: "лв" },
  { code: "BHD", name: "Bahraini dinar", symbol: "BD" },
  { code: "BIF", name: "Burundian franc", symbol: "FBu" },
  { code: "BMD", name: "Bermudian dollar", symbol: "BD$" },
  { code: "BND", name: "Brunei dollar", symbol: "B$" },
  { code: "BOB", name: "Bolivian boliviano", symbol: "Bs" },
  { code: "BRL", name: "Brazilian real", symbol: "R$" },
  { code: "BSD", name: "Bahamian dollar", symbol: "B$" },
  { code: "BTN", name: "Bhutanese ngultrum", symbol: "Nu" },
  { code: "BWP", name: "Botswana pula", symbol: "P" },
  { code: "BYN", name: "Belarusian ruble", symbol: "Br" },
  { code: "BZD", name: "Belize dollar", symbol: "BZ$" },
  { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  { code: "CDF", name: "Congolese franc", symbol: "FC" },
  { code: "CHF", name: "Swiss franc", symbol: "Fr" },
  { code: "CLP", name: "Chilean peso", symbol: "CL$" },
  { code: "CNY", name: "Chinese yuan", symbol: "CN¥" },
  { code: "COP", name: "Colombian peso", symbol: "COL$" },
  { code: "CRC", name: "Costa Rican colón", symbol: "₡" },
  { code: "CUP", name: "Cuban peso", symbol: "₱" },
  { code: "CVE", name: "Cape Verdean escudo", symbol: "Esc" },
  { code: "CZK", name: "Czech koruna", symbol: "Kč" },
  { code: "DJF", name: "Djiboutian franc", symbol: "Fdj" },
  { code: "DKK", name: "Danish krone", symbol: "kr" },
  { code: "DOP", name: "Dominican peso", symbol: "RD$" },
  { code: "DZD", name: "Algerian dinar", symbol: "DA" },
  { code: "EGP", name: "Egyptian pound", symbol: "ج.م" },
  { code: "ERN", name: "Eritrean nakfa", symbol: "Nfk" },
  { code: "ETB", name: "Ethiopian birr", symbol: "Br" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "FJD", name: "Fijian dollar", symbol: "FJ$" },
  { code: "FKP", name: "Falkland Islands pound", symbol: "FK£" },
  { code: "GBP", name: "British pound", symbol: "£" },
  { code: "GEL", name: "Georgian lari", symbol: "₾" },
  { code: "GHS", name: "Ghanaian cedi", symbol: "₵" },
  { code: "GIP", name: "Gibraltar pound", symbol: "£" },
  { code: "GMD", name: "Gambian dalasi", symbol: "D" },
  { code: "GNF", name: "Guinean franc", symbol: "FG" },
  { code: "GTQ", name: "Guatemalan quetzal", symbol: "Q" },
  { code: "GYD", name: "Guyanese dollar", symbol: "G$" },
  { code: "HKD", name: "Hong Kong dollar", symbol: "HK$" },
  { code: "HNL", name: "Honduran lempira", symbol: "L" },
  { code: "HTG", name: "Haitian gourde", symbol: "G" },
  { code: "HUF", name: "Hungarian forint", symbol: "Ft" },
  { code: "IDR", name: "Indonesian rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli shekel", symbol: "₪" },
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "IQD", name: "Iraqi dinar", symbol: "د.ع" },
  { code: "IRR", name: "Iranian rial", symbol: "Rl" },
  { code: "ISK", name: "Icelandic króna", symbol: "kr" },
  { code: "JMD", name: "Jamaican dollar", symbol: "J$" },
  { code: "JOD", name: "Jordanian dinar", symbol: "د.أ" },
  { code: "JPY", name: "Japanese yen", symbol: "¥" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh" },
  { code: "KGS", name: "Kyrgyzstani som", symbol: "с" },
  { code: "KHR", name: "Cambodian riel", symbol: "៛" },
  { code: "KMF", name: "Comorian franc", symbol: "CF" },
  { code: "KPW", name: "North Korean won", symbol: "₩" },
  { code: "KRW", name: "South Korean won", symbol: "₩" },
  { code: "KWD", name: "Kuwaiti dinar", symbol: "د.ك" },
  { code: "KYD", name: "Cayman Islands dollar", symbol: "CI$" },
  { code: "KZT", name: "Kazakhstani tenge", symbol: "₸" },
  { code: "LAK", name: "Lao kip", symbol: "₭" },
  { code: "LBP", name: "Lebanese pound", symbol: "ل.ل" },
  { code: "LKR", name: "Sri Lankan rupee", symbol: "Rs" },
  { code: "LRD", name: "Liberian dollar", symbol: "L$" },
  { code: "LSL", name: "Lesotho loti", symbol: "L" },
  { code: "LYD", name: "Libyan dinar", symbol: "LD" },
  { code: "MAD", name: "Moroccan dirham", symbol: "DH" },
  { code: "MDL", name: "Moldovan leu", symbol: "L" },
  { code: "MGA", name: "Malagasy ariary", symbol: "Ar" },
  { code: "MKD", name: "Macedonian denar", symbol: "ден" },
  { code: "MMK", name: "Myanmar kyat", symbol: "K" },
  { code: "MNT", name: "Mongolian tögrög", symbol: "₮" },
  { code: "MOP", name: "Macanese pataca", symbol: "MOP$" },
  { code: "MRU", name: "Mauritanian ouguiya", symbol: "UM" },
  { code: "MUR", name: "Mauritian rupee", symbol: "Rs" },
  { code: "MVR", name: "Maldivian rufiyaa", symbol: "Rf" },
  { code: "MWK", name: "Malawian kwacha", symbol: "MK" },
  { code: "MXN", name: "Mexican peso", symbol: "MX$" },
  { code: "MYR", name: "Malaysian ringgit", symbol: "RM" },
  { code: "MZN", name: "Mozambican metical", symbol: "MT" },
  { code: "NAD", name: "Namibian dollar", symbol: "N$" },
  { code: "NGN", name: "Nigerian naira", symbol: "₦" },
  { code: "NIO", name: "Nicaraguan córdoba", symbol: "C$" },
  { code: "NOK", name: "Norwegian krone", symbol: "kr" },
  { code: "NPR", name: "Nepalese rupee", symbol: "Rs" },
  { code: "NZD", name: "New Zealand dollar", symbol: "NZ$" },
  { code: "OMR", name: "Omani rial", symbol: "RO" },
  { code: "PAB", name: "Panamanian balboa", symbol: "B/." },
  { code: "PEN", name: "Peruvian sol", symbol: "S/" },
  { code: "PGK", name: "Papua New Guinean kina", symbol: "K" },
  { code: "PHP", name: "Philippine peso", symbol: "₱" },
  { code: "PKR", name: "Pakistani rupee", symbol: "Rs" },
  { code: "PLN", name: "Polish złoty", symbol: "zł" },
  { code: "PYG", name: "Paraguayan guaraní", symbol: "₲" },
  { code: "QAR", name: "Qatari riyal", symbol: "ر.ق" },
  { code: "RON", name: "Romanian leu", symbol: "lei" },
  { code: "RSD", name: "Serbian dinar", symbol: "din" },
  { code: "RUB", name: "Russian ruble", symbol: "₽" },
  { code: "RWF", name: "Rwandan franc", symbol: "FRw" },
  { code: "SAR", name: "Saudi riyal", symbol: "ر.س" },
  { code: "SBD", name: "Solomon Islands dollar", symbol: "SI$" },
  { code: "SCR", name: "Seychellois rupee", symbol: "Rs" },
  { code: "SDG", name: "Sudanese pound", symbol: "SD£" },
  { code: "SEK", name: "Swedish krona", symbol: "kr" },
  { code: "SGD", name: "Singapore dollar", symbol: "S$" },
  { code: "SHP", name: "Saint Helena pound", symbol: "£" },
  { code: "SLE", name: "Sierra Leonean leone", symbol: "Le" },
  { code: "SOS", name: "Somali shilling", symbol: "Sh" },
  { code: "SRD", name: "Surinamese dollar", symbol: "SR$" },
  { code: "STN", name: "São Tomé and Príncipe dobra", symbol: "Db" },
  { code: "SYP", name: "Syrian pound", symbol: "ل.س" },
  { code: "SZL", name: "Swazi lilangeni", symbol: "E" },
  { code: "THB", name: "Thai baht", symbol: "฿" },
  { code: "TJS", name: "Tajikistani somoni", symbol: "SM" },
  { code: "TMT", name: "Turkmenistani manat", symbol: "m" },
  { code: "TND", name: "Tunisian dinar", symbol: "DT" },
  { code: "TOP", name: "Tongan paʻanga", symbol: "T$" },
  { code: "TRY", name: "Turkish lira", symbol: "₺" },
  { code: "TTD", name: "Trinidad and Tobago dollar", symbol: "TT$" },
  { code: "TWD", name: "New Taiwan dollar", symbol: "NT$" },
  { code: "TZS", name: "Tanzanian shilling", symbol: "TSh" },
  { code: "UAH", name: "Ukrainian hryvnia", symbol: "₴" },
  { code: "UGX", name: "Ugandan shilling", symbol: "USh" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "UYU", name: "Uruguayan peso", symbol: "$U" },
  { code: "UZS", name: "Uzbekistani som", symbol: "so'm" },
  { code: "VES", name: "Venezuelan bolívar", symbol: "Bs" },
  { code: "VND", name: "Vietnamese đồng", symbol: "₫" },
  { code: "VUV", name: "Vanuatu vatu", symbol: "VT" },
  { code: "WST", name: "Samoan tālā", symbol: "T" },
  { code: "XAF", name: "Central African CFA franc", symbol: "FCFA" },
  { code: "XCD", name: "East Caribbean dollar", symbol: "EC$" },
  { code: "XOF", name: "West African CFA franc", symbol: "F CFA" },
  { code: "XPF", name: "CFP franc", symbol: "₣" },
  { code: "YER", name: "Yemeni rial", symbol: "YRl" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
  { code: "ZMW", name: "Zambian kwacha", symbol: "ZK" },
  { code: "ZWL", name: "Zimbabwean dollar", symbol: "Z$" },
];

const BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code, currency]));

const MARKS: Record<string, string> = {
  $: "USD",
  US$: "USD",
  USD: "USD",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
  "¥": "JPY",
  JPY: "JPY",
  LS: "SYP",
  "£S": "SYP",
  "S£": "SYP",
  "ل.س": "SYP",
  "ل.س.": "SYP",
  SYP: "SYP",
  "ر.س": "SAR",
  SAR: "SAR",
  "د.إ": "AED",
  AED: "AED",
  "د.ك": "KWD",
  KWD: "KWD",
  "د.أ": "JOD",
  JOD: "JOD",
  "ج.م": "EGP",
  EGP: "EGP",
  "ل.ل": "LBP",
  LBP: "LBP",
  "د.ع": "IQD",
  IQD: "IQD",
  "ر.ق": "QAR",
  QAR: "QAR",
};

const DETECT_CURRENCY: { code: string; pattern: RegExp }[] = [
  { code: "SYP", pattern: /ل\s*\.\s*س|ليرة\s*سورية/ },
  { code: "SAR", pattern: /ر\s*\.\s*س|ريال\s*سعودي/ },
  { code: "AED", pattern: /د\s*\.\s*إ|درهم\s*إمارات/ },
  { code: "KWD", pattern: /د\s*\.\s*ك|دينار\s*كويت/ },
  { code: "IQD", pattern: /د\s*\.\s*ع|دينار\s*عراق/ },
  { code: "JOD", pattern: /د\s*\.\s*أ|دينار\s*أردن|دينار\s*اردن/ },
  { code: "EGP", pattern: /ج\s*\.\s*م|جنيه\s*مصر/ },
  { code: "LBP", pattern: /ل\s*\.\s*ل|ليرة\s*لبنانية/ },
  { code: "QAR", pattern: /ر\s*\.\s*ق|ريال\s*قطر/ },
];

/** Minor-unit places. Dollars use 2. Jordanian and Kuwaiti dinars use 3. Syrian and Lebanese pounds use 0. */
export function fractionDigits(code: string): number {
  if (code === "KWD" || code === "JOD") return 3;
  if (code === "SYP" || code === "LBP") return 0;
  return 2;
}

export function detectCurrency(text: string): string | null {
  for (const entry of DETECT_CURRENCY) {
    if (entry.pattern.test(text)) return entry.code;
  }
  if (/دينار/.test(text)) return "JOD";
  if (/€|\bEUR\b|يورو/.test(text)) return "EUR";
  if (/\$|\bUSD\b|دولار/.test(text)) return "USD";
  return null;
}

export function findCurrency(code: string): Currency {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_CURRENCY)!;
}

export function currencySymbol(code: string): string {
  return findCurrency(code).symbol;
}

export function currencyFromMark(mark: string | null | undefined): string {
  if (!mark) return DEFAULT_CURRENCY;
  const trimmed = mark.trim();
  const direct = MARKS[trimmed] ?? MARKS[trimmed.toUpperCase()];
  if (direct) return direct;
  const byCode = BY_CODE.get(trimmed.toUpperCase());
  if (byCode) return byCode.code;
  const bySymbol = CURRENCIES.find((currency) => currency.symbol === trimmed);
  return bySymbol?.code ?? DEFAULT_CURRENCY;
}

export function searchCurrencies(query: string): Currency[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...CURRENCIES];
  return CURRENCIES.filter((currency) => {
    const haystack = `${currency.name} ${currency.code} ${currency.symbol}`.toLowerCase();
    return haystack.includes(needle);
  });
}
