import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Sem fallback de propósito: o provider é postgresql, então cair num arquivo
    // SQLite só produziria um erro incompreensível. Faltando a variável, falha aqui.
    url: process.env.DATABASE_URL ?? "",
  },
});
