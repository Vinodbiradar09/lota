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

// api.post(
//   "/users",
//   { name: "lota", email: "fggfh@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 20 },
// );

// api.put(
//   "/users/1",
//   { name: "dhurandhar", email: "dhurandhar@gmail.com" },
//   { headers: { "Content-Type": "application/json" } },
// );

// api.delete("/users/13", { headers: { "Content-Type": "application/json" } });
// api.patch(
//   "/users/5",
//   { name: "dhars", email: "dhars@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 100 },
// );
