import type { Database } from "@bantuanku/db";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface DonationEmailParams {
  donorEmail: string;
  donorName: string;
  campaignTitle: string;
  amount: number;
  invoiceNumber: string;
  paymentMethod: string;
}

export interface CampaignStatusEmailParams {
  adminEmail: string;
  campaignTitle: string;
  status: string;
  reason?: string;
}

export interface DisbursementEmailParams {
  adminEmail: string;
  campaignTitle: string;
  amount: number;
  disbursementId: number;
}

// HTML-escape nilai dinamis yang masuk ke badan email. Nama pendaftar bebas diisi siapa pun (termasuk orang yang
// mendaftar dengan email korban), jadi tanpa ini ia bisa menyuntikkan tautan/markup ke email yang dikirim dari
// domain pengirim platform (ADR-0011).
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private frontendUrl: string;
  private adminUrl: string;

  constructor(apiKey: string, fromEmail: string, fromName: string = "", frontendUrl: string = "", adminUrl: string = "") {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    this.frontendUrl = frontendUrl.replace(/\/+$/, "");
    this.adminUrl = adminUrl.replace(/\/+$/, "");
  }

  async send(params: EmailParams): Promise<boolean> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: params.from || `${this.fromName} <${this.fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        console.error("Email send failed:", await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error("Email send error:", error);
      return false;
    }
  }

  // Email transaksional akun (verifikasi/reset). Nama brand datang dari fromName (diambil dari settings
  // oleh pemanggil), bukan hardcode.
  private accountEmailHtml(params: { heading: string; intro: string; buttonLabel: string; url: string; note: string }): string {
    const brand = this.fromName;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .small { font-size: 12px; color: #6b7280; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>${params.heading}</h1></div>
            <div class="content">
              ${params.intro}
              <p style="text-align: center;"><a href="${esc(params.url)}" class="button">${params.buttonLabel}</a></p>
              <p class="small">Jika tombol tidak berfungsi, salin tautan ini ke browser:<br>${esc(params.url)}</p>
              <p>${params.note}</p>
            </div>
            <div class="footer">
              <p>${esc(brand)}</p>
              <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendEmailVerification(params: { to: string; name: string; url: string }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `Verifikasi email Anda${this.fromName ? ` - ${this.fromName}` : ""}`,
      html: this.accountEmailHtml({
        heading: "Verifikasi Email",
        intro: `<p>Halo ${esc(params.name)},</p><p>Terima kasih telah mendaftar. Klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun.</p>`,
        buttonLabel: "Verifikasi Email",
        url: params.url,
        note: "Tautan ini berlaku 24 jam dan hanya bisa dipakai sekali. Jika Anda tidak merasa mendaftar, abaikan email ini.",
      }),
    });
  }

  async sendPasswordResetLink(params: { to: string; name: string; url: string }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `Atur ulang password${this.fromName ? ` - ${this.fromName}` : ""}`,
      html: this.accountEmailHtml({
        heading: "Atur Ulang Password",
        intro: `<p>Halo ${esc(params.name)},</p><p>Kami menerima permintaan untuk mengatur ulang password akun Anda. Klik tombol di bawah untuk membuat password baru.</p>`,
        buttonLabel: "Atur Password Baru",
        url: params.url,
        note: "Tautan ini berlaku 1 jam dan hanya bisa dipakai sekali. Jika Anda tidak meminta ini, abaikan email ini; password Anda tetap aman.",
      }),
    });
  }

  async sendDonationConfirmation(params: DonationEmailParams): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Terima Kasih atas Donasi Anda!</h1>
            </div>
            <div class="content">
              <p>Halo ${esc(params.donorName)},</p>
              <p>Terima kasih telah berdonasi melalui ${esc(this.fromName)}. Donasi Anda akan sangat membantu.</p>

              <div class="details">
                <h3>Detail Donasi</h3>
                <div class="detail-row">
                  <span class="detail-label">Nomor Invoice:</span>
                  <span>${esc(params.invoiceNumber)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${esc(params.campaignTitle)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah Donasi:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Metode Pembayaran:</span>
                  <span>${esc(params.paymentMethod)}</span>
                </div>
              </div>

              <p>Donasi Anda sedang diproses. Anda akan menerima notifikasi setelah pembayaran dikonfirmasi.</p>

              <p style="text-align: center;">
                <a href="${this.frontendUrl}/account/donations" class="button">Lihat Status Donasi</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 ${esc(this.fromName)}. All rights reserved.</p>
              <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: params.donorEmail,
      subject: `Konfirmasi Donasi - ${params.invoiceNumber}`,
      html,
    });
  }

  async sendPaymentSuccess(params: DonationEmailParams & { receiptUrl?: string }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .success-icon { font-size: 48px; text-align: center; color: #10b981; }
            .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✓</div>
              <h1>Pembayaran Berhasil!</h1>
            </div>
            <div class="content">
              <p>Halo ${esc(params.donorName)},</p>
              <p>Pembayaran donasi Anda telah berhasil dikonfirmasi. Terima kasih atas kepercayaan Anda!</p>

              <div class="details">
                <h3>Detail Pembayaran</h3>
                <div class="detail-row">
                  <span class="detail-label">Nomor Invoice:</span>
                  <span>${esc(params.invoiceNumber)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${esc(params.campaignTitle)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Metode Pembayaran:</span>
                  <span>${esc(params.paymentMethod)}</span>
                </div>
              </div>

              <p>Donasi Anda akan segera disalurkan kepada yang membutuhkan.</p>

              <p style="text-align: center;">
                ${params.receiptUrl ? `<a href="${esc(params.receiptUrl)}" class="button">Download Bukti Donasi</a>` : ""}
                <a href="${this.frontendUrl}/account/donations" class="button">Lihat Riwayat Donasi</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 ${esc(this.fromName)}. All rights reserved.</p>
              <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: params.donorEmail,
      subject: `Pembayaran Berhasil - ${params.invoiceNumber}`,
      html,
    });
  }

  async sendCampaignStatusUpdate(params: CampaignStatusEmailParams): Promise<boolean> {
    const statusText = {
      approved: "Disetujui",
      rejected: "Ditolak",
      active: "Aktif",
      completed: "Selesai",
      draft: "Draft",
    }[params.status] || params.status;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .info-box { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Update Status Campaign</h1>
            </div>
            <div class="content">
              <p>Halo,</p>
              <p>Status campaign <strong>${esc(params.campaignTitle)}</strong> telah diubah menjadi: <strong>${statusText}</strong></p>

              ${params.reason ? `<div class="info-box"><p><strong>Alasan:</strong></p><p>${esc(params.reason)}</p></div>` : ""}

              <p style="text-align: center;">
                <a href="${this.adminUrl}/dashboard/campaigns" class="button">Lihat Campaign</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 ${esc(this.fromName)}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: params.adminEmail,
      subject: `Update Status Campaign - ${params.campaignTitle}`,
      html,
    });
  }

  async sendDisbursementNotification(params: DisbursementEmailParams): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Penyaluran Dana Campaign</h1>
            </div>
            <div class="content">
              <p>Halo,</p>
              <p>Dana untuk campaign <strong>${esc(params.campaignTitle)}</strong> telah disalurkan.</p>

              <div class="details">
                <h3>Detail Penyaluran</h3>
                <div class="detail-row">
                  <span class="detail-label">ID Penyaluran:</span>
                  <span>#${params.disbursementId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${esc(params.campaignTitle)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <p style="text-align: center;">
                <a href="${this.adminUrl}/dashboard/disbursements" class="button">Lihat Detail</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 ${esc(this.fromName)}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: params.adminEmail,
      subject: `Penyaluran Dana - ${params.campaignTitle}`,
      html,
    });
  }
}

export function createEmailService(apiKey: string, fromEmail: string, fromName?: string, frontendUrl?: string, adminUrl?: string): EmailService {
  return new EmailService(apiKey, fromEmail, fromName, frontendUrl, adminUrl);
}
