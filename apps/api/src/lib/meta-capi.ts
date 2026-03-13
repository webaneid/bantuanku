import { eq } from "drizzle-orm";
import { settings } from "@bantuanku/db/schema";
import { createHash } from "crypto";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

type UserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
};

type CustomData = {
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentType?: string;
  numItems?: number;
  contentName?: string;
  contentCategory?: string;
};

type CAPIEvent = {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  userData: UserData;
  customData?: CustomData;
};

function hashSHA256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function buildUserData(userData: UserData) {
  const data: Record<string, string> = {};
  if (userData.email) data.em = hashSHA256(userData.email);
  if (userData.phone) data.ph = hashSHA256(userData.phone.replace(/\D/g, ""));
  if (userData.firstName) data.fn = hashSHA256(userData.firstName);
  if (userData.clientIpAddress) data.client_ip_address = userData.clientIpAddress;
  if (userData.clientUserAgent) data.client_user_agent = userData.clientUserAgent;
  if (userData.fbc) data.fbc = userData.fbc;
  if (userData.fbp) data.fbp = userData.fbp;
  return data;
}

function buildCustomData(customData?: CustomData) {
  if (!customData) return undefined;
  const data: Record<string, any> = {};
  if (customData.currency) data.currency = customData.currency;
  if (customData.value !== undefined) data.value = customData.value;
  if (customData.contentIds) data.content_ids = customData.contentIds;
  if (customData.contentType) data.content_type = customData.contentType;
  if (customData.numItems !== undefined) data.num_items = customData.numItems;
  if (customData.contentName) data.content_name = customData.contentName;
  if (customData.contentCategory) data.content_category = customData.contentCategory;
  return data;
}

async function getCapiSettings(db: any): Promise<{ pixelId: string; accessToken: string } | null> {
  const integrationSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.category, "integration"));

  const pixelId = integrationSettings.find((s: any) => s.key === "meta_pixel_id")?.value;
  const accessToken = integrationSettings.find((s: any) => s.key === "meta_capi_access_token")?.value;

  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken };
}

export async function sendCAPIEvent(db: any, event: CAPIEvent): Promise<void> {
  try {
    const config = await getCapiSettings(db);
    if (!config) {
      console.warn("[Meta CAPI] Skipped: pixelId or accessToken not configured");
      return;
    }

    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event.eventId,
          event_source_url: event.eventSourceUrl,
          action_source: "website",
          user_data: buildUserData(event.userData),
          custom_data: buildCustomData(event.customData),
        },
      ],
    };

    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${config.pixelId}/events?access_token=${config.accessToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Meta CAPI] Error:", response.status, errorBody);
    } else {
      const responseBody = await response.json();
      console.log("[Meta CAPI] Success:", event.eventName, event.eventId, JSON.stringify(responseBody));
    }
  } catch (error) {
    console.error("[Meta CAPI] Failed to send event:", error);
  }
}
