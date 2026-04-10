import lota from "./index.js";

const api = lota.create({
  baseURL: "http://localhost:3000",
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  function (config: any) {
    console.log("this is req successfn");
    return config;
  },
  function (err: any) {
    console.log("this is req failfn");
    return Promise.reject(err);
  },
);

api.interceptors.response.use(
  function (response: any) {
    console.log("this is res successfn", response);
    return response;
  },
  function (err: any) {
    console.log("this is res failfn");
    return Promise.reject(err);
  },
);

async function main() {
  const res1 = await api.get("/user", {
    params: {
      id: 23,
    },
    headers: {
      "X-Custom-Header": "application/xml",
    },
    timeout: 200,
  });
  console.log("res1", res1);
  const data = await res1.data;
  console.log("data", data);

  // get all user
  const res2 = await api.get("/users", {
    headers: {
      "X-Custom-Header": "application/xml",
    },
  });
  console.log("res2", res2);
  const data2 = await res2.data;
  console.log("data2", data2);
}
main();

// api.post(
//   "/users",
//   { name: "mastan", email: "mastan@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 200 },
// );

// api.put(
//   "/users/30",
//   { name: "mastans", email: "mastans@gmail.com" },
//   { headers: { "Content-Type": "application/json" } },
// );

// api.delete("/users/9", { headers: { "Content-Type": "application/json" } });
// api.patch(
//   "/users/30",
//   { name: "mast", email: "mast@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 100 },
// );

// api.request({
//   url: "users/28",
//   data: { name: "letsgos", email: "letsgos@gmail.com" },
//   headers: {
//     "Content-Type": "application/json",
//   },
//   method: "PATCH",
// });

// const controller = new AbortController();

// api.patch(
//   "/user",
//   {},
//   {
//     signal: AbortSignal.timeout(4000),
//   },
// );
// controller.abort();
