import { lota } from "./lota.js";

const api = lota.create({
  baseURL: "http://localhost:3000",
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.get("/users", {
  headers: {
    "X-Custom-Header": "application/xml",
  },
});

api.post(
  "/users",
  { name: "lota", email: "tiger@gmail.com" },
  { headers: { "Content-Type": "application/json" } },
);
