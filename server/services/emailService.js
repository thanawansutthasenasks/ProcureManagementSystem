const FROM_EMAIL = process.env.MAIL_FROM;

const getGraphToken = async () => {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
    });

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Graph token error: ${err}`);
    }

    const json = await res.json();
    return json.access_token;
};

const sendEmail = async ({ to, cc, subject, htmlBody, pdfBuffer, pdfName }) => {
    const token = await getGraphToken();

    const toRecipients = to.split(",")
        .map(e => e.trim())
        .filter(Boolean)
        .map(address => ({ emailAddress: { address } }));

    const ccRecipients = cc
        ? cc.split(",").map(e => e.trim()).filter(Boolean).map(address => ({ emailAddress: { address } }))
        : [];

    const message = {
        subject,
        body: {
            contentType: "HTML",
            content: htmlBody,
        },
        toRecipients,
        ccRecipients,
        attachments: [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: pdfName,
                contentType: "application/pdf",
                contentBytes: Buffer.from(pdfBuffer).toString("base64"),
            },
        ],
    };

    const url = `https://graph.microsoft.com/v1.0/users/${FROM_EMAIL}/sendMail`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Graph sendMail error: ${err}`);
    }
};

module.exports = { sendEmail };