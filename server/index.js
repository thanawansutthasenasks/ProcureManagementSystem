const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// test api
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express" });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
