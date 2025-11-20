import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "upload-api" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // send file to python OCR service
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const response = await fetch("http://localhost:5001/ocr", {
      method: "POST",
      body: form,
    });

    // Check if OCR service responded successfully
    if (!response.ok) {
      fs.unlinkSync(filePath);
      return res.status(response.status).json({ 
        error: "OCR service error", 
        details: await response.text() 
      });
    }

    const result = await response.json();

    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
    }
    res.status(500).json({ 
      error: "OCR failed", 
      message: err.message 
    });
  }
});

app.listen(5050, () => console.log("Node server running on http://localhost:5050"));
