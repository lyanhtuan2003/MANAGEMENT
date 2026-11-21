
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

// Vercel Serverless Function
export default app;

// Chạy local bằng npm run dev hoặc npm start
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}
