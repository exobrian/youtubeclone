import express from "express";
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setUpDirectories, uploadProcessedVideo } from "./storage";

setUpDirectories();

const app = express();

// Set app to use jsons
app.use(express.json());

// Get Request: Home
app.get("/", (req, res) => {
    res.send("Hello! I'm working.");
})

// Post Request - this must be async as there is a specific order we need to follow.
app.post("/process-video", async (req, res) => {
    // Get bucket and filename from the Cloud Pub/Sub message
    let data;

    // Standard way of taking message from pub/sub messaging queue
    // Here, we take the message and parse it into data. 
    try {
        const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
        data = JSON.parse(message);
        if (!data.name) {
            throw new Error(`Invalid message received.`);
        }
    } catch (error) {
        console.error(error);
        return res.status(400).send(`Bad Request: missing filename`);
    }

    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;

    // 1. Download the raw video from cloud storage. Need to wait on this before continuing.
    await downloadRawVideo(inputFileName);

    // 2. Convert the raw video.
    try {
        await convertVideo(inputFileName, outputFileName);
    } catch(error) {
        // If there is an error, delete the files as they are corrupt.
        // We can join multiple promises into a single array and make all asynchronous.
        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)
        ]);

        console.error(error);
        return res.status(500).send("Internal Server Error: video processing failed.");
    }

    // 3. Upload the converted video to cloud storage.
    await uploadProcessedVideo(outputFileName);
    
    // 4. Now that we're successful, delete the files to save space.
    // We can join multiple promises into a single array and make all asynchronous.
    await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
    ]);
    return res.status(200).send("Processing finished successfully.");
})

// Set env variable for port in prod
const port = process.env.PORT || 3000;

// Start app server
app.listen(port, () => {
    console.log(`Video Processing Service listening on http://localhost:${port}`);
})