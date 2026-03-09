const express = require("express");
const router = express.Router();
const fs = require("fs");
const sql = require("mssql");
const azureJwt = require("./auth/azureJwt");
const userContext = require("./middleware/userContext");
const path = require("path");

const connectionString = fs.readFileSync(
  path.join(__dirname, "connection.txt"),
  "utf8"
).trim();
router.get("/test", (req, res) => {
  console.log("🔥 createpr test hit");
  res.send("createpr ok");
});

async function getPlanByOutletCode(outletCode) {
  const pool = await sql.connect(connectionString);

  const result = await pool.request()
    .input("OutletCode", sql.VarChar, outletCode)
    .query(`
      SELECT Plant
      FROM  t_outlet_master
      WHERE outletcode = @OutletCode
    `);
  if (result.recordset.length === 0) {
    throw new Error("No plant found for outlet code: " + outletCode);
  }
  return result.recordset[0].Plant;

}

router.get("/t_Material", azureJwt, userContext, async (req, res) => {
  try {
    const { roles, email } = req.userContext;

    let plnt;

    if (roles?.includes("Admin")) {
      plnt = req.query.plant;
      if (!plnt) {
        return res.status(400).send("Plant is required");
      }
    }
    else if (roles?.includes("outlet")) {
      const outletCode = email.split("@")[0].split(".")[0].toUpperCase();
      plnt = await getPlanByOutletCode(outletCode);
      if (!plnt) {
        return res.status(400).send("Plant is required");
      }
    } else {
      return res.status(403).send("Access denied");
    }

    const pool = await sql.connect(connectionString);
    const result = await pool.request()
      .input("plant", sql.VarChar, plnt)
      .query(`
      SELECT   plnt as Plant, Name_1, Distribution_Channel, Material_Type,pdt,standard_qty,
       Material, Material_Description, Base_Unit_of_Measure,
       Material_Group, Material_grp_desc_2,
       Moving_price, net_price
FROM (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY Material 
               ORDER BY net_price ASC
           ) AS rn
    FROM V_T_inforecord_Material
    WHERE plnt = @Plant
      AND Material_Type IN ('ZRMF', 'ZTRD', 'ZPAK')
      AND valid_to = '9999-12-31'
) t
WHERE rn = 1
ORDER BY Material;
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

router.get("/vendor/list", azureJwt, userContext, async (req, res) => {
  try {
    const pool = await sql.connect(connectionString);

    const result = await pool.request().query(`
      SELECT VendorID, Name, Description
      FROM tmsap_VENDOR_QAS
      ORDER BY VendorID
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Vendor list error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


router.post("/prtemp", azureJwt, userContext, async (req, res) => {
  try {
    const {
      lineItem,
      material,
      Material_Description,
      qty,
      Base_Unit_of_Measure,
      Plant,
      Name_1,
      net_price,
      pdt
    } = req.body;

    console.log("INSERT:", req.body);

    const pool = await sql.connect(connectionString);

    await pool.request()
      .input("line_item", sql.VarChar, lineItem)
      .input("Material", sql.VarChar, material)
      .input("Material_Description", sql.VarChar, Material_Description)
      .input("qty", sql.Decimal(10, 2), qty)
      .input("Base_Unit_of_Measure", sql.VarChar, Base_Unit_of_Measure)
      .input("Plant", sql.VarChar, Plant)
      .input("Name_1", sql.VarChar, Name_1)
      .input("net_price", sql.Decimal(10, 2), net_price)
      .input("pdt", sql.Int, pdt)
      .query(`
         INSERT INTO t_matpr_temp
        (line_item, Material, Material_Description, qty,
         Base_Unit_of_Measure, Plant, Name_1, net_price, pdt)
        VALUES
        (@line_item, @Material, @Material_Description, @qty,
         @Base_Unit_of_Measure, @Plant, @Name_1, @net_price, @pdt)
      `);

    res.json({ success: true });

  } catch (err) {
    console.error("PR TEMP ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


router.get("/prtemp", async (req, res) => {
  const { plant } = req.query;

  try {
    const pool = await sql.connect(connectionString);
    const result = await pool.request()
      .input("Plant", plant)
      .query(`
        SELECT  line_item AS lineItem,
                Plant,
                Name_1,
                Material,
                Material_Description,
                qty,
                Base_Unit_of_Measure,
                net_price,
                pdt
        FROM t_matpr_temp
        WHERE Plant = @Plant
        ORDER BY line_item
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Select Error:", err);
    res.status(500).json([]);
  }
});

router.get(
  "/outlet/list",
  async (req, res) => {
    try {
      const pool = await sql.connect(connectionString);
      const result = await pool.request().query(`
        SELECT outletcode, outletname, plant
        FROM t_outlet_master
        ORDER BY outletcode
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "DB error" });
    }
  }
);

router.post("/prtemp/updateQty", azureJwt, userContext, async (req, res) => {
  try {
    const { lineItem, qty } = req.body;

    const pool = await sql.connect(connectionString);

    await pool.request()
      .input("line_item", sql.VarChar, lineItem)
      .input("qty", sql.Decimal(10, 2), qty)
      .query(`
        UPDATE t_matpr_temp
        SET qty = @qty
        WHERE line_item = @line_item
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Update qty error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post("/prtemp/reindex", azureJwt, userContext, async (req, res) => {
  const items = req.body; // array [{oldLineItem, newLineItem}]

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  const pool = await sql.connect(connectionString);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    for (const item of items) {
      await transaction.request()
        .input("oldLineItem", sql.VarChar, item.oldLineItem)
        .input("newLineItem", sql.VarChar, item.newLineItem)
        .query(`
          UPDATE t_matpr_temp
          SET line_item = @newLineItem
          WHERE line_item = @oldLineItem
        `);
    }

    await transaction.commit();
    res.json({ success: true });

  } catch (err) {
    await transaction.rollback();
    console.error("Reindex error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});




module.exports = router;