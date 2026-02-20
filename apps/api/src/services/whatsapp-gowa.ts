interface GOWAConfig {
  apiUrl: string;
  username: string;
  password: string;
  deviceId: string;
  messageDelay: number;
}

export class GOWAClient {
  constructor(private config: GOWAConfig) {}

  private get baseHeaders(): Record<string, string> {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return {
      Authorization: `Basic ${credentials}`,
      "X-Device-Id": this.config.deviceId,
    };
  }

  private formatPhone(phone: string): string {
    let clean = phone
      .replace(/^\+/, "")
      .replace("@s.whatsapp.net", "")
      .replace(/[^0-9]/g, "");
    // Normalize: 08xx → 628xx
    if (clean.startsWith("0")) {
      clean = "62" + clean.substring(1);
    }
    // Handle double prefix: 6208xx → 628xx
    if (clean.startsWith("620")) {
      clean = "62" + clean.substring(3);
    }
    return `${clean}@s.whatsapp.net`;
  }

  async sendText(to: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/send/message`, {
        method: "POST",
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: this.formatPhone(to),
          message: text,
        }),
      });

      const result = (await response.json()) as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendText error:", err);
      return false;
    }
  }

  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append("phone", this.formatPhone(to));
      formData.append("image_url", imageUrl);
      if (caption) formData.append("caption", caption);

      const response = await fetch(`${this.config.apiUrl}/send/image`, {
        method: "POST",
        headers: this.baseHeaders,
        body: formData,
      });

      const result = (await response.json()) as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendImage error:", err);
      return false;
    }
  }

  async sendFile(
    to: string,
    fileBuffer: Buffer,
    filename: string,
    caption?: string
  ): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append("phone", this.formatPhone(to));
      formData.append("file", new Blob([fileBuffer]), filename);
      if (caption) formData.append("caption", caption);

      const response = await fetch(`${this.config.apiUrl}/send/file`, {
        method: "POST",
        headers: this.baseHeaders,
        body: formData,
      });

      const result = (await response.json()) as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendFile error:", err);
      return false;
    }
  }

  async checkStatus(): Promise<{
    connected: boolean;
    phoneNumber?: string;
  }> {
    const paths = ["/app/devices", "/devices"];
    for (const path of paths) {
      try {
        const response = await fetch(`${this.config.apiUrl}${path}`, {
          headers: this.baseHeaders,
        });
        if (response.status === 404) continue;

        const result = (await response.json()) as {
          code?: string;
          results?: any;
        };
        if (result.code !== "SUCCESS") continue;

        const devices = Array.isArray(result.results)
          ? result.results
          : Array.isArray(result.results?.devices)
            ? result.results.devices
            : [];

        if (devices.length === 0) continue;

        const device = this.config.deviceId
          ? devices.find(
              (d: any) =>
                d.id === this.config.deviceId ||
                d.device_id === this.config.deviceId ||
                d.device === this.config.deviceId ||
                d.device?.replace("@s.whatsapp.net", "") === this.config.deviceId
            ) || devices[0]
          : devices[0];

        return {
          connected:
            device.is_connected === true ||
            device.state === "connected" ||
            device.status === "connected" ||
            !!device.device || !!device.name,
          phoneNumber:
            device.phone_number ||
            device.device?.replace("@s.whatsapp.net", "") ||
            device.jid?.replace("@s.whatsapp.net", ""),
        };
      } catch {
        continue;
      }
    }
    return { connected: false };
  }

  async isRegistered(phone: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/user/check?phone=${this.formatPhone(phone)}`,
        { headers: this.baseHeaders }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async delay(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, this.config.messageDelay)
    );
  }
}
