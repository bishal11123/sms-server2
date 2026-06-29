import mongoose from "mongoose";

const calendarDaySchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["class", "holiday", "weekend"],
    default: "class",
  },
  note: {
    type: String,
    default: "",
  },
});

export default mongoose.model("CalendarDay", calendarDaySchema);
