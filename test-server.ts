import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("<h1>TEST SERVER IS RUNNING</h1><p>If you see this, the server is working on port 3000.</p>");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Test server listening on http://0.0.0.0:${PORT}`);
});
