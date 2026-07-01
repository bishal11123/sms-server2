import express from "express";
import CalendarDay from "../models/CalendarDay.js";

const router = express.Router();

//
// =============================================
// 🔥 HELPER: AUTO GENERATE MISSING DAYS
// =============================================
const generateMissingDays = async (from, to) => {
  const bulk = [];

  const start = new Date(from);
  const end = new Date(to);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const dateStr = `${yyyy}-${mm}-${dd}`;
    const day = d.getDay();

    bulk.push({
      updateOne: {
        filter: { date: dateStr }, // ✅ REQUIRED
        update: {
          $setOnInsert: {
            date: dateStr,
            type: day === 6 ? "weekend" : "class",
          },
        },
        upsert: true, // ✅ REQUIRED
      },
    });
  }

  if (bulk.length > 0) {
    await CalendarDay.bulkWrite(bulk);
  }
};

//
// =============================================
// ✅ GET RANGE (FIXED)
// =============================================
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Missing from/to" });
    }

    // 🔥 STEP 1: AUTO FIX DATABASE
    await generateMissingDays(from, to);

    // 🔥 STEP 2: FETCH COMPLETE RANGE
    const days = await CalendarDay.find({
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 });

    res.json(days);

  } catch (err) {
    console.error("GET calendar error:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// =============================================
// ✅ UPSERT DAY
// =============================================
router.put("/", async (req, res) => {
  try {
    const { date, type, note } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date required" });
    }

    const updated = await CalendarDay.findOneAndUpdate(
      { date },
      { date, type, note },
      { upsert: true, new: true }
    );

    res.json(updated);

  } catch (err) {
    console.error("PUT calendar error:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// =============================================
// ✅ GENERATE YEAR (USES SAME ENGINE)
// =============================================
router.post("/generate-year", async (req, res) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({ error: "Year required" });
    }

    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    await generateMissingDays(from, to);

    res.json({ success: true });

  } catch (err) {
    console.error("Generate year error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
