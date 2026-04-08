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
//   { name: "raj", email: "raj@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 200 },
// );

// api.put(
//   "/users/28",
//   { name: "rajverma", email: "rajverma@gmail.com" },
//   { headers: { "Content-Type": "application/json" } },
// );

// api.delete("/users/8", { headers: { "Content-Type": "application/json" } });
// api.patch(
//   "/users/28",
//   { name: "raj_verma", email: "raj_verma@gmail.com" },
//   { headers: { "Content-Type": "application/json" }, timeout: 100 },
// );
