/**
 * PaymentMethodIcon — Icônes SVG inline pour les méthodes de paiement.
 *
 * Props :
 *   provider {string}  — identifiant de l'opérateur (voir PROVIDERS ci-dessous)
 *   size     {number}  — taille en px (défaut : 32)
 *   className {string} — classes supplémentaires
 */

const PROVIDERS = {
  // ── Mobile Money ──────────────────────────────────────────────────────────
  orange_money: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#FF6600" />
      <ellipse cx="20" cy="20" rx="10" ry="10" fill="white" />
      <ellipse cx="20" cy="20" rx="6" ry="6" fill="#FF6600" />
    </svg>
  ),

  mtn_momo: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#FFCC00" />
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a1a1a" fontFamily="sans-serif">MTN</text>
    </svg>
  ),

  wave: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#1DC9FF" />
      <path d="M10 22 Q15 14 20 22 Q25 30 30 22" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  ),

  moov: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0058A4" />
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="sans-serif">moov</text>
    </svg>
  ),

  airtel: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#E40000" />
      <path d="M20 10 C12 10 8 16 8 20 C8 24 12 28 20 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="20" r="3" fill="white" />
    </svg>
  ),

  // ── Paiement électronique ──────────────────────────────────────────────────
  cinetpay: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0066CC" />
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="sans-serif">CINET</text>
    </svg>
  ),

  paystack: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#00C3F7" />
      <rect x="10" y="15" width="20" height="3" rx="1.5" fill="white" />
      <rect x="10" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.7" />
    </svg>
  ),

  flutterwave: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F5A623" />
      <path d="M12 28 C14 22 18 18 22 16 C26 14 30 15 30 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M12 22 C14 18 17 16 20 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  ),

  stripe: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#635BFF" />
      <path fillRule="evenodd" clipRule="evenodd" d="M19 14c-3.3 0-5.5 1.6-5.5 4.1 0 4.3 5.9 3.6 5.9 5.5 0 .7-.7 1.1-1.9 1.1-1.7 0-3.8-.8-5.5-1.9v4c1.7.8 3.5 1.2 5.5 1.2 3.5 0 5.9-1.7 5.9-4.3 0-4.6-5.9-3.8-5.9-5.6 0-.6.5-1 1.6-1 1.4 0 3.1.6 4.5 1.5V15c-1.5-.7-3-.9-4.6-1z" fill="white" />
    </svg>
  ),

  // ── Crypto ────────────────────────────────────────────────────────────────
  bitcoin: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F7931A" />
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fontWeight="700" fill="white" fontFamily="sans-serif">₿</text>
    </svg>
  ),

  usdt: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#26A17B" />
      <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="800" fill="white" fontFamily="sans-serif">USDT</text>
      <text x="50%" y="67%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.8)" fontFamily="sans-serif">Tether</text>
    </svg>
  ),

  ethereum: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#627EEA" />
      <path d="M20 9L13 21L20 25L27 21L20 9Z" fill="white" opacity="0.9" />
      <path d="M20 27L13 23L20 31L27 23L20 27Z" fill="white" opacity="0.7" />
    </svg>
  ),

  // ── Voucher ───────────────────────────────────────────────────────────────
  voucher: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#8B5CF6" />
      <rect x="8" y="14" width="24" height="14" rx="3" fill="white" opacity="0.2" />
      <rect x="8" y="14" width="24" height="14" rx="3" stroke="white" strokeWidth="1.5" />
      <path d="M16 21h8M16 24h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="21" r="1.5" fill="white" />
    </svg>
  ),

  // ── Fallback ──────────────────────────────────────────────────────────────
  default: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#6B7280" />
      <path d="M8 16h24v10H8z" fill="white" opacity="0.2" />
      <path d="M8 16h24v10H8z" stroke="white" strokeWidth="1.5" />
      <path d="M8 20h24" stroke="white" strokeWidth="1.5" />
    </svg>
  ),
};

export default function PaymentMethodIcon({ provider = 'default', size = 32, className = '' }) {
  const key = (provider ?? '').toLowerCase().replace(/[\s-]/g, '_');
  const Icon = PROVIDERS[key] ?? PROVIDERS.default;

  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 ${className}`} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
export { PaymentMethodIcon };
