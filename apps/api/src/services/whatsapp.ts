import { eq } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { GOWAClient } from "./whatsapp-gowa";

interface WhatsAppConfig {
  enabled: boolean;
  apiUrl: string;
  username: string;
  password: string;
  deviceId: string;
  senderNumber: string;
  adminNumbers: string[];
  messageDelay: number;
}

interface SendParams {
  phone: string;
  templateKey: string;
  variables: Record<string, string>;
}

export class WhatsAppService {
  private envFrontendUrl?: string;
  private _config?: WhatsAppConfig;
  private _templates = new Map<string, string | null>();
  private _globalVars?: Record<string, string>;

  constructor(private db: Database, envFrontendUrl?: string) {
    this.envFrontendUrl = envFrontendUrl;
  }

  async getConfig(): Promise<WhatsAppConfig> {
    if (this._config) return this._config;
    const rows = await this.db.query.settings.findMany({
      where: eq(settings.category, "whatsapp"),
    });

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    this._config = {
      enabled: map["whatsapp_enabled"] === "true",
      apiUrl: map["whatsapp_api_url"] || "",
      username: map["whatsapp_username"] || "",
      password: map["whatsapp_password"] || "",
      deviceId: map["whatsapp_device_id"] || "",
      senderNumber: map["whatsapp_sender_number"] || "",
      adminNumbers: (() => {
        try {
          return JSON.parse(map["whatsapp_admin_numbers"] || "[]");
        } catch {
          return [];
        }
      })(),
      messageDelay: parseInt(map["whatsapp_message_delay"] || "2000", 10),
    };
    return this._config;
  }

  async getTemplate(key: string): Promise<string | null> {
    if (this._templates.has(key)) return this._templates.get(key)!;

    const enabledSetting = await this.db.query.settings.findFirst({
      where: eq(settings.key, `${key}_enabled`),
    });

    if (enabledSetting?.value !== "true") {
      this._templates.set(key, null);
      return null;
    }

    const templateSetting = await this.db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    const value = templateSetting?.value || null;
    this._templates.set(key, value);
    return value;
  }

  async getGlobalVariables(): Promise<Record<string, string>> {
    if (this._globalVars) return this._globalVars;

    const { inArray } = await import("drizzle-orm");
    const rows = await this.db.query.settings.findMany({
      where: inArray(settings.category, ["general", "organization"]),
    });

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    const now = new Date();

    const storeWebsite = map["organization_website"] || map["site_url"] || "";
    const frontendUrl = this.envFrontendUrl
      ? this.envFrontendUrl.replace(/\/+$/, "")
      : storeWebsite.replace(/\/+$/, "");

    this._globalVars = {
      store_name: map["organization_name"] || map["site_name"] || "",
      store_phone: map["organization_phone"] || map["contact_phone"] || "",
      store_whatsapp: map["organization_whatsapp"] || map["organization_phone"] || map["contact_phone"] || "",
      store_email: map["organization_email"] || map["contact_email"] || "",
      store_website: storeWebsite,
      frontend_url: frontendUrl,
      store_address: map["organization_detail_address"] || map["organization_address"] || map["contact_address"] || "",
      current_date: this.formatDate(now),
      current_time: now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB",
    };
    return this._globalVars;
  }

  renderTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  formatCurrency(amount: number): string {
    return (
      "Rp " +
      amount.toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return false;
    }

    if (!config.apiUrl || !config.username || !config.password) {
      console.warn("WhatsApp not configured: missing API URL or credentials");
      return false;
    }

    const client = new GOWAClient({
      apiUrl: config.apiUrl,
      username: config.username,
      password: config.password,
      deviceId: config.deviceId,
      messageDelay: config.messageDelay,
    });

    return client.sendText(phone, message);
  }

  async send(params: SendParams): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.enabled) {
      console.warn("[WA] send skipped: whatsapp_enabled is false");
      return false;
    }

    const template = await this.getTemplate(params.templateKey);
    if (!template) {
      console.warn(`[WA] send skipped: template ${params.templateKey} not found or disabled`);
      return false;
    }

    const globalVars = await this.getGlobalVariables();
    const allVars = { ...globalVars, ...params.variables };
    const message = this.renderTemplate(template, allVars);

    console.log(`[WA] sending to ${params.phone} via template ${params.templateKey}`);
    const result = await this.sendMessage(params.phone, message);
    console.log(`[WA] send result: ${result}`);
    return result;
  }

  async sendBulk(
    recipients: Array<{ phone: string; variables: Record<string, string> }>,
    templateKey: string
  ): Promise<void> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return;
    }

    const template = await this.getTemplate(templateKey);
    if (!template) {
      return;
    }

    const globalVars = await this.getGlobalVariables();

    const client = new GOWAClient({
      apiUrl: config.apiUrl,
      username: config.username,
      password: config.password,
      deviceId: config.deviceId,
      messageDelay: config.messageDelay,
    });

    for (const recipient of recipients) {
      const allVars = { ...globalVars, ...recipient.variables };
      const message = this.renderTemplate(template, allVars);

      try {
        await client.sendText(recipient.phone, message);
        await client.delay();
      } catch (err) {
        console.error(
          `WhatsApp bulk send error to ${recipient.phone}:`,
          err
        );
      }
    }
  }

  async sendToAdmins(
    templateKey: string,
    variables: Record<string, string>
  ): Promise<void> {
    const config = await this.getConfig();

    if (!config.enabled || config.adminNumbers.length === 0) {
      return;
    }

    const template = await this.getTemplate(templateKey);
    if (!template) {
      return;
    }

    const globalVars = await this.getGlobalVariables();
    const allVars = { ...globalVars, ...variables };
    const message = this.renderTemplate(template, allVars);

    const client = new GOWAClient({
      apiUrl: config.apiUrl,
      username: config.username,
      password: config.password,
      deviceId: config.deviceId,
      messageDelay: config.messageDelay,
    });

    for (const adminPhone of config.adminNumbers) {
      try {
        await client.sendText(adminPhone, message);
        await client.delay();
      } catch (err) {
        console.error(`WhatsApp admin send error to ${adminPhone}:`, err);
      }
    }
  }
}
