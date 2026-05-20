export function scaleQuantity(qty: string, servings: number): string {
  if (servings === 1 || !qty) return qty;

  const match = qty.match(/^(\d+\/\d+|\d*\.?\d+)(.*)/);
  if (!match) return qty; // "to taste", "as needed", etc.

  const numStr = match[1].trim();
  const rest = match[2].trim();

  let num: number;
  if (numStr.includes('/')) {
    const [a, b] = numStr.split('/').map(Number);
    num = a / b;
  } else {
    num = parseFloat(numStr);
  }

  const scaled = num * servings;
  const formatted = Number.isInteger(scaled) ? scaled.toString() : parseFloat(scaled.toFixed(2)).toString();
  return rest ? `${formatted} ${rest}` : formatted;
}
