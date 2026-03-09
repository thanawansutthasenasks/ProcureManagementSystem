const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const azureJwt = require("./auth/azureJwt");
const userContext = require("./middleware/userContext");
const fs = require("fs");
const sql = require("mssql");
const { error } = require("console");

const connectionString = fs.readFileSync("connection.txt", "utf8").trim();

const router = express.Router();

async function moveTempToDB(prNumber, plant, vendorId) {
  const pool = await sql.connect(connectionString);
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    await request
      .input("prNumber", sql.VarChar, prNumber)
      .input("Plant", sql.VarChar, plant)
      .input("VendorId", sql.VarChar, vendorId)
      .query(`
        INSERT INTO t_matpr_db
        (
          prNumber,
          pr_date,
          line_item,
          Material,
          Material_Description,
          qty,
          Base_Unit_of_Measure,
          Plant,
          Name_1,
          status_d,
          VendorId
        )
        SELECT
          @prNumber,
          GETDATE(),
          line_item,
          Material,
          Material_Description,
          qty,
          Base_Unit_of_Measure,
          Plant,
          Name_1,
          1,
          @VendorId
        FROM t_matpr_temp
        WHERE Plant = @Plant
      `);

    await request.query(`
      DELETE FROM t_matpr_temp
      WHERE Plant = @Plant
    `);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}



router.post("/sap/createpr2sap", azureJwt,
  userContext, async (req, res) => {
    console.log("CREATE PR API CALLED");

    const { docDate, deliveryDate, items, VendorId } = req.body;

    let fixedVendor = "";

    if (VendorId && VendorId.trim() !== "") {
      fixedVendor = VendorId.toString().padStart(10, "0");
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        error: false,
        message: "No PR items"
      });
    }

    const itemXml = items
      .map((item, idx) => `
      <item>
        <PREQ_ITEM>${String((idx + 1) * 10).padStart(5, "0")}</PREQ_ITEM>
        <DOC_TYPE>NB</DOC_TYPE>
        <PUR_GROUP>101</PUR_GROUP>
        <PREQ_DATE>${docDate}</PREQ_DATE>
        <MATERIAL>00000000${item.Material}</MATERIAL>
        <PLANT>${item.Plant}</PLANT>
        <QUANTITY>${item.qty}</QUANTITY>
        <UNIT>${item.Base_Unit_of_Measure}</UNIT>
        <DELIV_DATE>${deliveryDate}</DELIV_DATE>
        <C_AMT_BAPI>1</C_AMT_BAPI>
        <PRICE_UNIT>1</PRICE_UNIT>
        <PURCH_ORG>SKS</PURCH_ORG>
        <PREQ_NAME>pr2sap</PREQ_NAME>
       <FIXED_VEND>${fixedVendor}</FIXED_VEND>
      </item>
    `)
      .join("");

    const soapRequest = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:ZBAPI_PR_CREATE>
      <REQUISITION_ITEMS>
        ${itemXml}
      </REQUISITION_ITEMS>
    </urn:ZBAPI_PR_CREATE>
  </soapenv:Body>
</soapenv:Envelope>
`;

    console.log("SAP REQUEST XML:\n", soapRequest);
    try {
      const response = await axios.post(
        "http://APPSAPPRD.sukishi.co.th:8000/sap/bc/srt/rfc/sap/zbapi_pr_create_new/400/zbapi_create_pr_service/zbapi_create_pr_binding",
        soapRequest,
        {
          headers: {
            "Content-Type": "text/xml; charset=UTF-8",
            SOAPAction:
              "urn:sap-com:document:sap:rfc:functions:ZBAPI_PR_CREATE:ZBAPI_PR_CREATERequest"
          },
          timeout: 60000
        }
      );

      console.log("SAP CALL SUCCESS");

      const parser = new xml2js.Parser({ explicitArray: false });
      const parsed = await parser.parseStringPromise(response.data);

      const body =
        parsed["soap-env:Envelope"]["soap-env:Body"];

      const sapResp =
        body["n0:ZBAPI_PR_CREATEResponse"] ||
        body["ZBAPI_PR_CREATEResponse"];

      const prNumber = sapResp?.NUMBER || null;
      const prItems = sapResp?.REQUISITION_ITEMS?.item || [];

      console.log("PR NUMBER:", prNumber);
      console.log("PR ITEMS:", prItems);

      if (!prNumber) {
        return res.status(500).json({
          success: false,
          message: "PR created but PR number not returned",
          rawSapResponse: response.data
        });
      }

      const plant = items[0].Plant;

      await moveTempToDB(prNumber, plant, VendorId);


      return res.json({
        success: true,
        prNumber,
        items: Array.isArray(prItems) ? prItems : [prItems]
      });

    } catch (err) {
      console.error("SAP ERROR:", err.message);

      if (err.response?.data) {
        console.error("SAP FAULT XML:\n", err.response.data);
        return res.status(500).json({
          success: false,
          message: "SAP Error",
          sapError: err.response.data
        });
      }

      if (err.code === "ECONNABORTED") {
        return res.status(504).json({
          success: false,
          message: "SAP TIMEOUT"
        });
      }

      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  });

router.delete("/prtemp/:lineItem", azureJwt,
  userContext, async (req, res) => {
    const { lineItem } = req.params;
    try {
      const pool = await sql.connect(connectionString);

      await pool.request()
        .input("line_item", sql.VarChar, lineItem)
        .query(`
        DELETE FROM t_matpr_temp
        WHERE line_item = @line_item
      `);
      res.json({ success: true });

    } catch (err) {
      console.error("Delete prtemp error:", err);
      res.status(500).json({
        success: false,
        message: "Delete failed"
      });
    }
  });

module.exports = router;
