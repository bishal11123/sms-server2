// server/routes/studentRoutes.js
import express from "express";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import fs from "fs";

const router = express.Router();

// ===========================
// CREATE REQUIRED FOLDERS
// ===========================
["uploads/profile-images", "uploads/documents"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ===========================
// MULTER STORAGE
// ===========================
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/profile-images"),
  filename: (req, file, cb) => cb(null, `${req.params.id || Date.now()}${path.extname(file.originalname)}`),
});
const uploadProfile = multer({ storage: profileStorage });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/documents"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadDoc = multer({ storage: docStorage });

// ===========================
// HELPERS
// ===========================
async function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (err) {
    console.warn(`Failed to delete ${filePath}:`, err.message);
  }
}

function parseJSONField(field, fallback = []) {
  try {
    return field ? JSON.parse(field) : fallback;
  } catch {
    return fallback;
  }
}

function parseStudentData(body, file, existing = {}) {
  return {
    firstName: body.firstName ?? existing.firstName,
    lastName: body.lastName ?? existing.lastName,
    phone: body.phone ?? existing.phone,
    sex: body.sex ?? existing.sex,
    dob: body.dob ? new Date(body.dob) : existing.dob,
    pob: body.pob ?? existing.pob,
    email: body.email ?? existing.email,
    currAdd: body.currAdd ?? existing.currAdd,
    tempAdd: body.tempAdd ?? existing.tempAdd,
    perAdd: body.perAdd ?? existing.perAdd,
    passNum: body.passNum ?? existing.passNum,
    passDoi: body.passDoi ? new Date(body.passDoi) : existing.passDoi,
    passDoe: body.passDoe ? new Date(body.passDoe) : existing.passDoe,
    COEStatus: body.COEStatus ?? existing.COEStatus,
    remarks: body.remarks ?? existing.remarks,
    classId: body.classId ?? existing.classId,
    profileImage: file ? file.filename : existing.profileImage,
    academicRecords: parseJSONField(body.academicRecords, existing.academicRecords),
    familyMembers: parseJSONField(body.familyMembers, existing.familyMembers),
    workExperiences: parseJSONField(body.workExperiences, existing.workExperiences),
    documents: parseJSONField(body.documents, existing.documents),
  };
}

// ===========================
// ROUTES
// ===========================

// 1️⃣ GET dashboard summary
router.get("/summary", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const pendingCoe = await Student.countDocuments({ COEStatus: "Pending" });
    const appliedCoe = await Student.countDocuments({ COEStatus: "Applied" });
    const receivedCoe = await Student.countDocuments({ COEStatus: "Received" });

    res.json({ totalStudents, pendingCoe, appliedCoe, receivedCoe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// 2️⃣ Search students
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const results = await Student.find({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
      ],
    }).limit(10);

    res.json(results.map(s => ({ id: s._id, name: `${s.firstName} ${s.lastName}` })));
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// 3️⃣ GET all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().populate("classId");
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// 4️⃣ GET single student
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// 5️⃣ CREATE student
router.post("/", uploadProfile.single("profileImage"), async (req, res) => {
  try {
    const studentData = parseStudentData(req.body, req.file);
    const student = new Student(studentData);
    await student.save();
    if (student.classId) {
      await Class.findByIdAndUpdate(student.classId, { $addToSet: { students: student._id } });
    }
    res.status(201).json({ student });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// 6️⃣ UPDATE student
router.put("/:id", uploadProfile.single("profileImage"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const updatedData = parseStudentData(req.body, req.file, student);
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, updatedData, { new: true }).populate("classId");
    res.json(updatedStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update student" });
  }
});

// 7️⃣ DELETE student
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.profileImage) await safeDelete(path.join("uploads/profile-images", student.profileImage));
    if (student.documents?.length > 0) {
      for (const doc of student.documents) {
        await safeDelete(path.join("uploads/documents", doc.fileName));
      }
    }

    if (student.classId) {
      await Class.findByIdAndUpdate(student.classId, { $pull: { students: student._id } });
    }

    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete student" });
  }
});

// 8️⃣ UPLOAD documents
router.post("/:id/documents", uploadDoc.array("documents"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const uploadedDocs = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      let finalName = file.filename;

      if ([".jpg", ".jpeg", ".png"].includes(ext)) {
        const webpName = `${Date.now()}.webp`;
        const webpPath = path.join("uploads/documents", webpName);
        await sharp(file.path).webp({ quality: 80 }).toFile(webpPath);
        await safeDelete(file.path);
        finalName = webpName;
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/documents/${finalName}`;

student.documents.push({
  fileName: finalName,
  filePath: fileUrl,
});

uploadedDocs.push({
  fileName: finalName,
  fileUrl,
});

    }

    await student.save();
    res.status(201).json({ uploadedDocs, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload documents" });
  }
});

// 9️⃣ DELETE document
router.delete("/:id/documents/:docId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const docIndex = student.documents.findIndex(d => d._id.toString() === req.params.docId);
    if (docIndex === -1) return res.status(404).json({ message: "Document not found" });

    await safeDelete(path.join("uploads/documents", student.documents[docIndex].fileName));
    student.documents.splice(docIndex, 1);
    await student.save();

    res.json({ student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete document" });
  }
});


// 1️⃣1️⃣ Serve static uploads
router.use("/uploads/profile-images", express.static(path.join("uploads/profile-images")));
router.use("/uploads/documents", express.static(path.join("uploads/documents")));

export default router;
