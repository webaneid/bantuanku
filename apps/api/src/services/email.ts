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

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey: string, fromEmail: string, fromName: string = "Bantuanku") {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
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
              <p>Halo ${params.donorName},</p>
              <p>Terima kasih telah berdonasi melalui Bantuanku. Donasi Anda akan sangat membantu.</p>

              <div class="details">
                <h3>Detail Donasi</h3>
                <div class="detail-row">
                  <span class="detail-label">Nomor Invoice:</span>
                  <span>${params.invoiceNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${params.campaignTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah Donasi:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Metode Pembayaran:</span>
                  <span>${params.paymentMethod}</span>
                </div>
              </div>

              <p>Donasi Anda sedang diproses. Anda akan menerima notifikasi setelah pembayaran dikonfirmasi.</p>

              <p style="text-align: center;">
                <a href="https://bantuanku.org/account/donations" class="button">Lihat Status Donasi</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Bantuanku. All rights reserved.</p>
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
              <p>Halo ${params.donorName},</p>
              <p>Pembayaran donasi Anda telah berhasil dikonfirmasi. Terima kasih atas kepercayaan Anda!</p>

              <div class="details">
                <h3>Detail Pembayaran</h3>
                <div class="detail-row">
                  <span class="detail-label">Nomor Invoice:</span>
                  <span>${params.invoiceNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${params.campaignTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Metode Pembayaran:</span>
                  <span>${params.paymentMethod}</span>
                </div>
              </div>

              <p>Donasi Anda akan segera disalurkan kepada yang membutuhkan.</p>

              <p style="text-align: center;">
                ${params.receiptUrl ? `<a href="${params.receiptUrl}" class="button">Download Bukti Donasi</a>` : ""}
                <a href="https://bantuanku.org/account/donations" class="button">Lihat Riwayat Donasi</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Bantuanku. All rights reserved.</p>
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
              <p>Status campaign <strong>${params.campaignTitle}</strong> telah diubah menjadi: <strong>${statusText}</strong></p>

              ${params.reason ? `<div class="info-box"><p><strong>Alasan:</strong></p><p>${params.reason}</p></div>` : ""}

              <p style="text-align: center;">
                <a href="https://admin.bantuanku.org/campaigns" class="button">Lihat Campaign</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Bantuanku. All rights reserved.</p>
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
              <p>Dana untuk campaign <strong>${params.campaignTitle}</strong> telah disalurkan.</p>

              <div class="details">
                <h3>Detail Penyaluran</h3>
                <div class="detail-row">
                  <span class="detail-label">ID Penyaluran:</span>
                  <span>#${params.disbursementId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Campaign:</span>
                  <span>${params.campaignTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah:</span>
                  <span>Rp ${params.amount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <p style="text-align: center;">
                <a href="https://admin.bantuanku.org/disbursements" class="button">Lihat Detail</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Bantuanku. All rights reserved.</p>
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

export function createEmailService(apiKey: string, fromEmail: string, fromName?: string): EmailService {
  return new EmailService(apiKey, fromEmail, fromName);
}
