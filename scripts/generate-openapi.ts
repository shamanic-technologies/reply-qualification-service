import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "../src/schemas.js";
import { writeFileSync } from "fs";

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Reply Qualification Service",
    description: "AI-powered email reply qualification and classification",
  },
  servers: [
    { url: process.env.SERVICE_URL || "http://localhost:3000" },
  ],
});

writeFileSync("openapi.json", JSON.stringify(document, null, 2));
console.log("Generated openapi.json");
