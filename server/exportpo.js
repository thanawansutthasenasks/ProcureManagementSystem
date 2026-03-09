const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const Handlebars = require("handlebars");

const azureJwt = require("./auth/azureJwt");
const userContext = require("./middleware/userContext");
const { generatePdfBuffer } = require("./services/pdfService");
const { sendEmail } = require("./services/emailService");

const connectionString = fs
  .readFileSync(path.join(__dirname, "connection.txt"), "utf8")
  .trim();

const emailTemplateSource = fs.readFileSync(
  path.join(__dirname, "templates/email-po.hbs"),
  "utf8",
);
const emailTemplate = Handlebars.compile(emailTemplateSource);

// Helpers

const formatDate = (raw) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

const formatTime = (raw) => {
  if (!raw) return "";
  return String(raw).split(".")[0];
};

const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// mapPoRows — flat DB rows → nested object สำหรับ template
const mapPoRows = (rows) => {
  if (!rows || rows.length === 0) throw new Error("No PO data");

  const h = rows[0];

  const items = rows.map((row) => ({
    lineNo: row.ItemNo,
    materialCode: row.MaterialCode,
    description: row.Description,
    deliveryDate: formatDate(row.DeliveryDate),
    qty: Number(row.Quantity).toFixed(3),
    unit: row.Unit,
    unitPrice: formatNumber(row.UnitPrice),
    lineTotal: formatNumber(row.TotalValue),
  }));

  const now = new Date();
  const printDateTime = `${formatDate(now.toISOString())} ${now.toTimeString().slice(0, 8)}`;
  const emptyRows = Array(Math.max(0, 5 - items.length)).fill({});

  return {
    company: {
      logoPath: "",
      fullName: h.CompanyName,
      address: h.CompanyAddress || "",
      phone: h.CompanyPhone || "",
      fax: h.CompanyFax || "",
      vatRegNo: h.CompanyVAT || "",
    },
    supplier: {
      supplierNo: h.SupplierNo || "",
      companyName: h.VendorName || "",
      address: h.VendorAddress || "",
      phone: h.VendorPhone || "",
      contactPerson: h.ContactPerson || "",
      contactEmail: h.VendorEmail || "",
    },
    delivery: {
      address: h.DeliveryAddress || "",
      phone: h.DeliveryPhone || "",
    },
    po: {
      poNumber: h.PONumber || "",
      poDate: formatDate(h.PODate),
      purchasingGroup: h.PurchasingGroup || "",
      paymentTerm: h.PaymentTerm || "",
      incoterm: "-",
      portOfDelivery: "-",
      modeOfShipment: "-",
      remark: h.POHeaderText || "",
    },
    items,
    emptyRows,
    summary: {
      totalExclVat: formatNumber(h.TotalExclVAT),
      discount: formatNumber(h.Discount),
      netAmount: formatNumber(h.NetAmount),
      vat: formatNumber(h.VAT),
      totalTHB: formatNumber(h.TotalTHB),
      amountInWords: "",
    },
    footer: {
      purchaserCode: h.PurchaserID || "",
      purchaserName: "",
      purchaseDate: formatDate(h.PurchaserDate),
      purchaseTime: formatTime(h.PurchaserTime),
      authorizerName: h.AuthorizerID || "",
      authorizeDate: formatDate(h.AuthorizerDate),
      authorizeTime: formatTime(h.AuthorizerTime),
      notes: [
        "ใบสั่งซื้อจะมีผลบังคับใช้ก็ต่อเมื่อมีลายเซ็นต์ผู้มีอำนาจลงนามเท่านั้น",
        "หากไม่สามารถจัดส่งสินค้าได้ตามกำหนด กรุณาแจ้งให้ทราบทันที",
        "กรุณาระบุเลขที่ใบสั่งซื้อทุกครั้งในใบส่งสินค้า หรือใบกำกับภาษี",
        "กรณีสินค้าผิดสเปค ปฏิเสธการรับ",
      ],
      printDateTime,
      pageNumber: 1,
      totalPages: 1,
    },
  };
};

// Query PO Detail (ใช้รวมกันทั้ง GET detail และ send-email)
const queryPoDetail = async (poNumber) => {
  const pool = await sql.connect(connectionString);

  const result = await pool.request().input("PONumber", sql.VarChar, poNumber)
    .query(`
      SELECT
        po.Purchasing_Document AS PONumber,
        po.Document_Date       AS PODate,
        po.Vendor              AS SupplierNo,
        po.Terms_of_Payment    AS PaymentTerm,
        RTRIM(po.Purchasing_Group) + '-' + ISNULL(RTRIM(pg.Description), '') AS PurchasingGroup,
        ISNULL(NULLIF(RTRIM(REPLACE(po.POHeaderText, '<(>&<)>', '&')), ''), '') AS POHeaderText,
        RTRIM(comp.Name) + ' (' +
          RTRIM(SUBSTRING(pa_ho.Name_1, 1, CHARINDEX('(', pa_ho.Name_1 + '(') - 1)) + ')' AS CompanyName,
        comp.VAT_Registration_No AS CompanyVAT,
        comp.Telephone           AS CompanyPhone,
        comp.Fax                 AS CompanyFax,
        CONCAT_WS(' ',
          NULLIF(RTRIM(comp.Street), ''), NULLIF(RTRIM(comp.Street_2), ''),
          NULLIF(RTRIM(comp.Street_3), ''), NULLIF(RTRIM(comp.Street_4), ''),
          NULLIF(RTRIM(comp.Street_5), ''), NULLIF(RTRIM(comp.District), ''),
          NULLIF(RTRIM(comp.City2), ''), NULLIF(RTRIM(comp.Postal_Code), '')
        ) AS CompanyAddress,
        CONCAT_WS(' ',
          NULLIF(RTRIM(v_addr.Title), ''), NULLIF(RTRIM(v_addr.Name), ''),
          NULLIF(RTRIM(v_addr.Name_3), '')
        ) AS VendorName,
        CONCAT_WS(' ',
          NULLIF(RTRIM(v_addr.co), ''), NULLIF(RTRIM(v_addr.Street_2), ''),
          NULLIF(RTRIM(v_addr.House_Number), ''), NULLIF(RTRIM(v_addr.Street_4), ''),
          NULLIF(RTRIM(v_addr.Street_5), ''), NULLIF(RTRIM(v_addr.District), ''),
          NULLIF(RTRIM(v_addr.City), ''), NULLIF(RTRIM(v_addr.Postal_Code), '')
        ) AS VendorAddress,
        v_addr.Telephone  AS VendorPhone,
        ven.EMail_Address AS VendorEmail,
        ISNULL(NULLIF(RTRIM(po.Salesperson), ''), '') AS ContactPerson,
        CONCAT_WS(', ',
          NULLIF(RTRIM(pa.Name_1), ''),
          CONCAT_WS(' ',
            NULLIF(RTRIM(pa.Street), ''), NULLIF(RTRIM(pa.Street_2), ''),
            NULLIF(RTRIM(pa.Street_4), ''), NULLIF(RTRIM(pa.Street_5), ''),
            NULLIF(RTRIM(pa.District), ''), NULLIF(RTRIM(pa.City), ''),
            NULLIF(RTRIM(pa.Postal_Code), '')
          )
        ) AS DeliveryAddress,
        pa.Telephone AS DeliveryPhone,
        ROW_NUMBER() OVER (PARTITION BY po.Purchasing_Document ORDER BY po.Item) AS ItemNo,
        po.Material          AS MaterialCode,
        RTRIM(po.Short_Text) AS Description,
        po.Delivery_Date     AS DeliveryDate,
        po.Order_Quantity    AS Quantity,
        po.Order_Unit        AS Unit,
        po.Net_Order_Price   AS UnitPrice,
        po.Net_Order_Value   AS TotalValue,
        SUM(po.Net_Order_Value) OVER (PARTITION BY po.Purchasing_Document) AS TotalExclVAT,
        0 AS Discount,
        SUM(po.Net_Order_Value) OVER (PARTITION BY po.Purchasing_Document) AS NetAmount,
        0 AS VAT,
        SUM(po.Net_Order_Value) OVER (PARTITION BY po.Purchasing_Document) AS TotalTHB,
        ISNULL(NULLIF(RTRIM(po.Created_by), ''), '') AS PurchaserID,
        po.Created_on AS PurchaserDate,
        ''            AS PurchaserTime,
        ISNULL(NULLIF(RTRIM(app.User_sap), ''), '') AS AuthorizerID,
        app.Date_create AS AuthorizerDate,
        CONVERT(VARCHAR(8), app.Time_create, 108) AS AuthorizerTime
      FROM dbo.tmsap_PO_MASTER po
      LEFT JOIN dbo.tmsap_Company_Master comp
        ON RTRIM(po.Company_Code) = RTRIM(comp.Company_Code)
      LEFT JOIN dbo.tmsap_Plant_Address pa_ho ON pa_ho.Plant = '1000'
      LEFT JOIN dbo.tmsap_VENDOR_MASTER ven
        ON RTRIM(po.Vendor) = RTRIM(CAST(ven.VendorID AS NVARCHAR))
      LEFT JOIN dbo.tmsap_VENDOR_ADDRESS v_addr
        ON RTRIM(po.Vendor) = RTRIM(CAST(v_addr.Vendor AS NVARCHAR))
      LEFT JOIN dbo.tmsap_Plant_Address pa
        ON RTRIM(po.Plant) = RTRIM(pa.Plant)
      LEFT JOIN dbo.tmsap_Pur_group pg
        ON RTRIM(po.Purchasing_Group) = RTRIM(pg.Pur_Group)
      LEFT JOIN (
        SELECT Object_value, User_sap, Date_create, Time_create
        FROM (
          SELECT Object_value, User_sap, Date_create, Time_create,
                 ROW_NUMBER() OVER (
                   PARTITION BY Object_value
                   ORDER BY Date_create DESC, Time_create DESC
                 ) AS rn
          FROM dbo.tmsap_PO_Approve
        ) t WHERE rn = 1
      ) app ON RTRIM(po.Purchasing_Document) = RTRIM(app.Object_value)
      WHERE po.Purchasing_Document = @PONumber
    `);

  return result.recordset;
};

router.get("/po/list", azureJwt, userContext, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.max(1, parseInt(req.query.pageSize) || 20);
    const search = (req.query.search || "").trim();
    const fromDate = req.query.fromDate || "";
    const toDate = req.query.toDate || "";
    const offset = (page - 1) * pageSize;

    const pool = await sql.connect(connectionString);

    const searchCondition = search
      ? `AND (
           po.Purchasing_Document LIKE '%' + @search + '%'
         )`
      : "";

    // กรองวันที่
    let dateCondition = "";
    if (fromDate && toDate) {
      dateCondition = " AND po.Document_Date BETWEEN @fromDate AND @toDate ";
    } else if (fromDate) {
      dateCondition = " AND po.Document_Date >= @fromDate ";
    } else if (toDate) {
      dateCondition = " AND po.Document_Date <= @toDate ";
    }

    // Request นับจำนวน
    const reqCount = pool.request().input("search", sql.NVarChar, search);
    if (fromDate) reqCount.input("fromDate", sql.Date, fromDate);
    if (toDate) reqCount.input("toDate", sql.Date, toDate);

    const countResult = await reqCount.query(`
        SELECT COUNT(*) AS Total
        FROM (
          SELECT DISTINCT po.Purchasing_Document
          FROM dbo.tmsap_PO_MASTER po
          INNER JOIN dbo.tmsap_PO_Approve app
            ON RTRIM(po.Purchasing_Document) = RTRIM(app.Object_value)
          LEFT JOIN dbo.tmsap_VENDOR_ADDRESS v_addr
            ON RTRIM(po.Vendor) = RTRIM(CAST(v_addr.Vendor AS NVARCHAR))
          WHERE 1=1 ${searchCondition} ${dateCondition}
        ) AS cnt
      `);

    const total = countResult.recordset[0].Total;

    // Request สำหรับดึงข้อมูล
    const reqData = pool.request()
      .input("search", sql.NVarChar, search)
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize);
    if (fromDate) reqData.input("fromDate", sql.Date, fromDate);
    if (toDate) reqData.input("toDate", sql.Date, toDate);

    const dataResult = await reqData.query(`
        SELECT DISTINCT
          RTRIM(po.Purchasing_Document) AS PONumber,
          po.Document_Date              AS PODate,
          po.Vendor                     AS SupplierNo,
          CONCAT_WS(' ',
            NULLIF(RTRIM(v_addr.Title),  ''),
            NULLIF(RTRIM(v_addr.Name),   ''),
            NULLIF(RTRIM(v_addr.Name_3), '')
          ) AS VendorName,
          ven.EMail_Address AS VendorEmail
        FROM dbo.tmsap_PO_MASTER po
        INNER JOIN dbo.tmsap_PO_Approve app
          ON RTRIM(po.Purchasing_Document) = RTRIM(app.Object_value)
        LEFT JOIN dbo.tmsap_VENDOR_ADDRESS v_addr
          ON RTRIM(po.Vendor) = RTRIM(CAST(v_addr.Vendor AS NVARCHAR))
        LEFT JOIN dbo.tmsap_VENDOR_MASTER ven
          ON RTRIM(po.Vendor) = RTRIM(CAST(ven.VendorID AS NVARCHAR))
        WHERE 1=1 ${searchCondition} ${dateCondition}
        ORDER BY po.Document_Date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    res.json({ data: dataResult.recordset, total, page, pageSize });
  } catch (err) {
    console.error("PO list error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/po/detail/:poNumber", azureJwt, userContext, async (req, res) => {
  try {
    const records = await queryPoDetail(req.params.poNumber);

    if (!records.length) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }

    const data = mapPoRows(records);
    res.json({ success: true, data });
  } catch (err) {
    console.error("PO detail error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// body: { emails: [{ poNumber, to, cc }] }
router.post("/po/send-email", azureJwt, userContext, async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "emails array is required" });
  }

  const results = [];

  for (const item of emails) {
    const { poNumber, to, cc } = item;

    try {
      const records = await queryPoDetail(poNumber);
      if (!records.length) throw new Error(`PO ${poNumber} not found`);

      const data = mapPoRows(records);
      const pdfName = `PO-${poNumber}.pdf`;

      const pdfBuffer = await generatePdfBuffer(data);

      // Render email body (แบบไม่ใช้เมลตัวเอง)
      /* const htmlBody = emailTemplate({
        ...data,
        pdfName,
        senderEmail: process.env.MAIL_FROM,
      }); */

      // Render email body (แบบใช้เมลตัวเองที่ login อยู่)
      const htmlBody = emailTemplate({
        ...data,
        pdfName,
        senderEmail: req.userContext.email,
        senderName: req.userContext.name,
      });

      await sendEmail({
        to,
        cc,
        subject: `Purchase Order: ${poNumber} | Sukishi Intergroup Co., Ltd.`,
        htmlBody,
        pdfBuffer,
        pdfName,
      });

      results.push({ poNumber, success: true });
      // console.log(`Email sent: PO ${poNumber} → ${to}`);
    } catch (err) {
      // console.error(`Email failed: PO ${poNumber}`, err.message);
      results.push({ poNumber, success: false, error: err.message });
    }
  }

  const allSuccess = results.every((r) => r.success);
  const anySuccess = results.some((r) => r.success);

  res.json({
    success: allSuccess,
    partial: !allSuccess && anySuccess,
    results,
    message: allSuccess
      ? `ส่ง Email สำเร็จ ${results.length} รายการ`
      : `ส่งสำเร็จ ${results.filter((r) => r.success).length}/${results.length} รายการ`,
  });
});

module.exports = router;
