export default function CurrencySelector({ value, onChange }) {
  const currencies = [
    { code: "XOF", label: "Franc CFA BCEAO (XOF)" },
    { code: "EUR", label: "Euro (EUR)" },
    { code: "USD", label: "Dollar US (USD)" },
    { code: "GHS", label: "Cedi Ghanéen (GHS)" },
    { code: "NGN", label: "Naira Nigérian (NGN)" },
  ];
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)}
      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm">
      {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
    </select>
  );
}
