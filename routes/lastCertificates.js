// routes/lastCertificates.js
import express from "express";
import LastCertificate from "../models/LastCertificate.js";

const router = express.Router();

// Save or update last certificate
router.post("/students/:studentId/certificates/:type", async (req, res) => {
  try {
    const { studentId, type } = req.params;
    const { generatedData, pdfBase64 } = req.body;

    console.log("📥 Incoming save request:", {
      studentId,
      type,
      hasGeneratedData: !!generatedData,
      hasPdfBase64: !!pdfBase64,
      pdfBase64Length: pdfBase64?.length
    });

    if (!generatedData || !pdfBase64) {
      console.log("❌ Missing fields");
      return res.status(400).json({ error: "Missing generatedData or pdfBase64" });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    const saved = await LastCertificate.findOneAndUpdate(
      { studentId, certificateType: type },
      {
        generatedData,
        pdfData: pdfBuffer,
        pdfMimeType: "application/pdf",
      },
      { new: true, upsert: true }
    );

    console.log("✅ Saved certificate:", saved._id);

    res.json(saved);
  } catch (err) {
    console.error("🔥 Save certificate error:", err);
    res.status(500).json({ error: "Failed to save certificate", details: err.message });
  }
});

// Get all certificates for student
router.get("/students/:studentId/certificates", async (req, res) => {
  try {
    const certs = await LastCertificate.find({
      studentId: req.params.studentId,
    });

    res.json(certs);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch certificates" });
  }
});

// ==============================
// UPDATE SOP
// ==============================
router.put("/certificates/:id/sop", async (req, res) => {
  try {
    const { sopContent } = req.body;

    if (!sopContent) {
      return res.status(400).json({ error: "SOP content required" });
    }

    const cert = await LastCertificate.findById(req.params.id);

    if (!cert) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    cert.sopContent = sopContent;
    cert.sopUpdatedAt = new Date();

    await cert.save();

    res.json({ message: "SOP updated", data: cert });
  } catch (err) {
    console.error("SOP error:", err);
    res.status(500).json({ error: "Failed to update SOP" });
  }
});

export default router;
