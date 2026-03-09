const express = require("express");
const cors = require("cors");

const app = express();
require("dotenv").config();

const allowedOrigins = [
  "http://localhost:5173",
  "https://uat-pms.sukishigroup.com"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));



app.use(express.json());

app.use("/api", require("./createpr"));
app.use("/api", require("./createpr2sap"));
app.use("/api", require("./history"));
app.use("/api", require("./delete2sap"));
app.use("/api", require("./exportpo"));

app.listen(3001, () => console.log("Server running"));
