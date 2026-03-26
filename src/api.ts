import express from "express";

const api = express.Router();

api.use(express.json());

// Health check
api.get("/health", (req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

api.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

export default api;
