import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });

  console.log("starting response");

  let count = 0;
  const interval = setInterval(() => {
    const chunk = Buffer.alloc(100, ".");
    console.log(`- writing chunk ${count}`);
    res.write(chunk);

    count++;

    if (count >= 60) {
      console.log("ending response");
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});

const PORT = 6661;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
