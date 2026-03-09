const express = require("express");
const axios = require("axios");
const sql = require("mssql");
const fs = require("fs");
const azureJwt = require("./auth/azureJwt");
const userContext = require("./middleware/userContext")
const router = express.Router();
const connectionString = fs
  .readFileSync("connection.txt", "utf8")
  .trim();

router.post("/sap/cancelpr2sap",azureJwt,
  userContext,async (req, res) => {
  const { prNumber } = req.body;
  if (!prNumber) {
    return res.status(400).json({ error: "prNumber is required" });
  }
  try {
    const pool = await sql.connect(connectionString);
    const result = await pool.request()
      .input("prNumber", sql.VarChar, prNumber)
      .query(`
        SELECT line_item
        FROM t_matpr_db
        WHERE prNumber = @prNumber
        ORDER BY line_item
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "PR not found"
      });
    }
    let itemXml = "";
    result.recordset.forEach(r => {
      itemXml += `
    <item>
      <PREQ_ITEM>${r.line_item.padStart(5, "0")}</PREQ_ITEM>
      <DELETE_IND>X</DELETE_IND>
      <CLOSED>X</CLOSED>
    </item>
  `;
    });

    const soapXml = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:BAPI_REQUISITION_DELETE>
      <NUMBER>${prNumber}</NUMBER>

      <REQUISITION_ITEMS_TO_DELETE>
        ${itemXml}
      </REQUISITION_ITEMS_TO_DELETE>

      <RETURN>
        <item>
          <TYPE></TYPE>
          <CODE></CODE>
          <MESSAGE></MESSAGE>
          <LOG_NO></LOG_NO>
          <LOG_MSG_NO></LOG_MSG_NO>
          <MESSAGE_V1></MESSAGE_V1>
          <MESSAGE_V2></MESSAGE_V2>
          <MESSAGE_V3></MESSAGE_V3>
          <MESSAGE_V4></MESSAGE_V4>
        </item>
      </RETURN>

    </urn:BAPI_REQUISITION_DELETE>
  </soapenv:Body>
</soapenv:Envelope>
`.trim();
   const sapRes = await axios.post(
  "http://appsapprd.sukishi.co.th:8000/sap/bc/srt/rfc/sap/zbapi_pr_del_item/400/zbapi_pr_del_item_service/zbapi_pr_del_item_binding",
  soapXml,
  {
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      "SOAPAction": "urn:sap-com:document:sap:rfc:functions:BAPI_REQUISITION_DELETE"
    },
    timeout: 60000
  }
);
    const sapXmlResponse = sapRes.data;
    const isError = /<TYPE>E<\/TYPE>/i.test(sapXmlResponse);

    if (isError) {
      return res.status(400).json({
        success: false,
        message: "SAP Cancel Failed",
        sapResponse: sapXmlResponse
      });
    }
    await pool.request()
      .input("prNumber", sql.VarChar, prNumber)
      .query(`
    UPDATE t_matpr_db
    SET status_d = 0
    WHERE prNumber = @prNumber
  `);

    res.json({
      success: true,
      prNumber,
      sapResponse: sapRes.data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "SAP Cancel Failed",
      error: err.message
    });
  }
});

module.exports = router;