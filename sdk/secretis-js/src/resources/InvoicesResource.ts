import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Invoice,
  ListInvoicesParams,
  CreateInvoiceData,
  RecordPaymentData,
} from '../types/index.js';

/**
 * InvoicesResource — Module Facturation du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Créer une facture
 * const invoice = await client.invoices.create({
 *   client_name: 'ACME SARL',
 *   client_email: 'comptabilite@acme.ci',
 *   currency: 'XOF',
 *   tax_rate: 18,
 *   items: [
 *     { description: 'Prestation conseil', quantity: 1, unit_price: 500000 },
 *     { description: 'Rapport d\'audit', quantity: 2, unit_price: 75000 },
 *   ],
 * });
 *
 * // URL du PDF
 * const pdfUrl = client.invoices.getPdfUrl(invoice.id);
 *
 * // Enregistrer un paiement mobile money
 * await client.invoices.recordPayment(invoice.id, {
 *   amount: 650000,
 *   payment_method: 'cinetpay',
 *   reference: 'CPY-20260721-001',
 * });
 * ```
 */
export class InvoicesResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Liste paginée des factures.
   */
  async list(params?: ListInvoicesParams): Promise<PaginatedResponse<Invoice>> {
    const { data } = await this.http.get<PaginatedResponse<Invoice>>(
      '/invoices',
      { params },
    );
    return data;
  }

  /**
   * Récupère une facture avec ses lignes et paiements.
   */
  async get(id: string): Promise<Invoice> {
    const { data } = await this.http.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return data.data;
  }

  /**
   * Crée une nouvelle facture (statut initial : draft).
   */
  async create(payload: CreateInvoiceData): Promise<Invoice> {
    const { data } = await this.http.post<ApiResponse<Invoice>>('/invoices', payload);
    return data.data;
  }

  /**
   * Retourne l'URL de téléchargement du PDF de la facture.
   * L'URL est signée et valide 30 minutes.
   *
   * @param id  UUID de la facture
   */
  getPdfUrl(id: string): string {
    const baseURL = (this.http.defaults.baseURL ?? '').replace(/\/$/, '');
    return `${baseURL}/invoices/${id}/pdf`;
  }

  /**
   * Enregistre un paiement sur une facture.
   * Si le montant payé atteint le total, le statut passe à "paid" automatiquement.
   */
  async recordPayment(id: string, payload: RecordPaymentData): Promise<Invoice> {
    const { data } = await this.http.post<ApiResponse<Invoice>>(
      `/invoices/${id}/pay`,
      payload,
    );
    return data.data;
  }
}
