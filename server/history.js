const express = require("express");
const fs = require("fs");
const sql = require("mssql");

const router = express.Router();
const connectionString = fs.readFileSync("connection.txt", "utf8").trim();
const passport = require("passport");

router.get("/history/pr", async (req, res) => {
  try {
    const {
      prNumber = "",
      fromDate = "",
      toDate = "",
      plant: queryPlant = "",
      page = 1,
      pageSize = 10
    } = req.query;
   let plant = queryPlant;

const roles = req.user?.roles || [];
if (roles.includes("outlet")) {
  const email = req.user.preferred_username;
  plant = email.split(".")[0].trim(); 
}

    const offset = (page - 1) * pageSize;
    const pool = await sql.connect(connectionString);
    const request = pool.request();

    let where = "WHERE status_d >= 0";

    if (prNumber) {
      where += " AND prNumber LIKE @prNumber";
      request.input("prNumber", sql.VarChar, `%${prNumber}%`);
    }

    if (fromDate) {
      where += " AND pr_date >= @fromDate";
      request.input("fromDate", sql.Date, fromDate);
    }

    if (toDate) {
      where += " AND pr_date < DATEADD(DAY, 1, @toDate)";
      request.input("toDate", sql.Date, toDate);
    }
    if (plant) {
      where += " AND Plant = @plant"; 
      request.input("plant", sql.VarChar, plant);
    }

  
    const countResult = await request.query(`
      SELECT COUNT(DISTINCT prNumber) AS total
      FROM t_matpr_db
      ${where}
    `);

    const total = countResult.recordset[0].total;


    const prPageResult = await request
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, Number(pageSize))
      .query(`
        SELECT prNumber, MAX(pr_date) AS pr_date
        FROM t_matpr_db
        ${where}
        GROUP BY prNumber
        ORDER BY MAX(pr_date) DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);

    const prList = prPageResult.recordset.map(r => r.prNumber);

    if (prList.length === 0) {
      return res.json({ data: [], total });
    }

   
   const dataResult = await pool.request()
  .input("fromDate", sql.Date, fromDate || null)
  .input("toDate", sql.Date, toDate || null)
  .input("plant", sql.VarChar, plant || null)
  .query(`
    SELECT
      pr.prNumber,
      CONVERT(varchar, pr.pr_date, 120) AS pr_date,
      pr.line_item,
      pr.Material,
      pr.Material_Description,
      pr.qty,
      pr.Base_Unit_of_Measure,
      pr.Plant,
      pr.Name_1,
      pr.status_d,
      pr.vendorId,
      v.Name AS vendorName
    FROM t_matpr_db pr
    LEFT JOIN tmsap_VENDOR_QAS v
      ON LTRIM(RTRIM(pr.vendorId)) = LTRIM(RTRIM(v.VendorID))
    WHERE pr.prNumber IN (${prList.map(p => `'${p}'`).join(",")})
    ${fromDate ? "AND pr.pr_date >= @fromDate" : ""}
    ${toDate ? "AND pr.pr_date < DATEADD(DAY, 1, @toDate)" : ""}
    ${plant ? "AND pr.Plant = @plant" : ""}
    ORDER BY pr.pr_date DESC, pr.prNumber DESC, pr.line_item
  `);
  console.log(dataResult.recordset[0]);

    res.json({
      data: dataResult.recordset,
      total
    });

  } catch (err) {
    console.error("REPORT PR ERROR:", err);
    res.status(500).json({ data: [], total: 0 });
  }
});
router.get("/report/pr/top-material", async (req, res) => {
  try {
    const { fromDate = "", toDate = "", top = 10, plant = "" } = req.query;

    const pool = await sql.connect(connectionString);
    const request = pool.request();

    let where = "WHERE 1=1";

    if (plant) {
      where += " AND Plant = @plant";
      request.input("plant", sql.VarChar, plant);
    }

    if (fromDate) {
      where += " AND pr_date >= @fromDate";
      request.input("fromDate", sql.Date, fromDate);
    }

    if (toDate) {
      where += " AND pr_date < DATEADD(DAY, 1, @toDate)";
      request.input("toDate", sql.Date, toDate);
    }

    const result = await request
      .input("top", sql.Int, Number(top))
      .query(`
        SELECT TOP (@top)
          Material,
          Material_Description,
          SUM(CAST(qty AS DECIMAL(18,2))) AS total_qty
        FROM t_matpr_db
        ${where}
        GROUP BY Material, Material_Description
        ORDER BY SUM(CAST(qty AS DECIMAL(18,2))) DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("TOP MATERIAL ERROR:", err);
    res.status(500).json([]);
  }
});
router.get("/outlet/list", async (req, res) => {
  try {
    const pool = await sql.connect(connectionString);

    const result = await pool.request().query(`
      SELECT
        outletcode,
        outletname,
        plant
      FROM t_outlet_master
      ORDER BY outletcode
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("OUTLET LIST ERROR:", err);
    res.status(500).json([]);
  }
});


router.get("/outlet/me", async (req, res) => {
  try {
    const { outletCode } = req.query;
    console.log("OUTLET ME:", outletCode);
    if (!outletCode) {
      return res.status(400).json({ message: "outletCode is required" });
    }

    const pool = await sql.connect(connectionString);

    const result = await pool.request()
      .input("outletcode", sql.VarChar, outletCode)
      .query(`
       SELECT
          outletcode,
          outletname,
          plant
        FROM t_outlet_master
        WHERE outletcode = @outletcode
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("OUTLET ME ERROR:", err);
    res.status(500).json([]);
  }
});


module.exports = router;