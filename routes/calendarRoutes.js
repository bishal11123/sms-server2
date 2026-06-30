import express from "express";
import CalendarDay from "../models/CalendarDay.js";

const router = express.Router();

//
// ✅ GET RANGE
//
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;

    const days = await CalendarDay.find({
      date: { $gte: from, $lte: to },
    });

    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ UPSERT DAY (update or create)
//
router.put("/", async (req, res) => {
  try {
    const { date, type, note } = req.body;

    const updated = await CalendarDay.findOneAndUpdate(
      { date },
      { type, note },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ GENERATE YEAR (IMPORTANT)
//
router.post("/generate-year", async (req, res) => {
  try {
    const { year } = req.body;

    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const bulk = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      const day = d.getDay();

      bulk.push({
        updateOne: {
          filter: { date: dateStr },
          update: {
            date: dateStr,
            type: day === 6 ? "weekend" : "class",
          },
          upsert: true,
        },
      });
    }

    await CalendarDay.bulkWrite(bulk);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
