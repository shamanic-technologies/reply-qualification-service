import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.js";
import qualifyRoutes from "./routes/qualify.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Routes
app.use(healthRoutes);
app.use(qualifyRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Reply Qualification Service running on port ${PORT}`);
});

export default app;
