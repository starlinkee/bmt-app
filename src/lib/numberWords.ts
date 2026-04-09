const ONES = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
const TEENS = [
  "dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście",
  "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście",
];
const TENS = [
  "", "", "dwadzieścia", "trzydzieści", "czterdzieści",
  "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt",
];
const HUNDREDS = [
  "", "sto", "dwieście", "trzysta", "czterysta",
  "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset",
];

function chunk(n: number): string {
  let result = "";
  const h = Math.floor(n / 100);
  n %= 100;
  if (h > 0) result += HUNDREDS[h] + " ";
  if (n >= 10 && n <= 19) {
    result += TEENS[n - 10] + " ";
    n = 0;
  } else if (n >= 20) {
    result += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) result += ONES[n] + " ";
  return result;
}

function thousandForm(n: number): string {
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 19) return "tysięcy";
  if (last1 === 1) return "tysiąc";
  if (last1 >= 2 && last1 <= 4) return "tysiące";
  return "tysięcy";
}

function zloteForm(n: number): string {
  if (n === 1) return "złoty";
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 19) return "złotych";
  if (last1 >= 2 && last1 <= 4) return "złote";
  return "złotych";
}

function intToWordsPL(n: number): string {
  if (n === 0) return "zero";
  let result = "";
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    result += intToWordsPL(m) + " milion" + (m === 1 ? "" : m % 10 >= 2 && m % 10 <= 4 && (m % 100 < 10 || m % 100 >= 20) ? "y" : "ów") + " ";
    n %= 1000000;
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    const form = thousandForm(k);
    if (k === 1) {
      result += "tysiąc ";
    } else {
      result += chunk(k) + form + " ";
    }
    n %= 1000;
  }
  if (n > 0) result += chunk(n);
  return result.trim();
}

export function amountToWordsPLN(amount: number): string {
  const zlote = Math.floor(amount);
  const grosze = Math.round((amount - zlote) * 100);
  const words = intToWordsPL(zlote);
  const currency = zloteForm(zlote);
  return `${words} ${currency} ${grosze.toString().padStart(2, "0")}/100`;
}
