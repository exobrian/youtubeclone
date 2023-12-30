import express from "express";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello! I'm working.");
})

app.listen(port, () => {
    console.log(`Video Processing Service listening on http://localhost:${port}`);
})