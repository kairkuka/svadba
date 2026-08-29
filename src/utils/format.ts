export function formatMoney(value: number) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} тг`;
}

