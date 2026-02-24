export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean | undefined> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";

  if (!token || !phoneNumberId) {
    console.error("WhatsApp config missing");
    return false;
  }

  // Basic formatting: ensure number has country code (88 for Bangladesh if starting with 01)
  let formattedTo = to.replace(/[^0-9]/g, "");
  if (formattedTo.startsWith("01") && formattedTo.length === 11) {
    formattedTo = "88" + formattedTo;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo,
          type: "text",
          text: {
            body: message,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("WhatsApp API Error Details:", JSON.stringify(data, null, 2));
    } else {
      console.log("WhatsApp message sent successfully:", data);
    }

    return response.ok;
  } catch (error) {
    console.error("WhatsApp network/fetch error:", error);
    return false;
  }
}