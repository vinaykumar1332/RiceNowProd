// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/orders", async (req, res) => {
  const mobile = req.query.mobile;
  const url = `https://script.google.com/macros/s/AKfycbx.../exec?mobile=${mobile}`;

  const response = await fetch(url);
  const data = await response.json();

  res.json(data); // now browser sees CORS headers from *your server*
});

app.listen(5000, () => console.log("Proxy running on http://localhost:5000"));
