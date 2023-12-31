import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = 'bt-yt-raw-videos';
const processedVideoBucketName = 'bt-yt-processed-videos';

const localRawVideoPath = './raw-videos';
const localProcessedVideoPath = './processed-videos';

/* 
* Function to setup local directories for raw and processed files
*/
export function setUpDirectories(){
    ensureDirectoryExistence(localRawVideoPath);
    ensureDirectoryExistence(localProcessedVideoPath);
}

/**
 * 
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been processed.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string){
    return new Promise<void>((resolve, reject) => {
        // Convert video by builder pattern
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOptions("-vf", "scale=-1:360")
        .on("end", () => {
            console.log("Video processed successfully!")
            resolve();
        })
        .on("error", (err) => {
            console.log(`An error has occurred: ${err.message}`);
            reject(err);
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`);
    })
}

/**
 * 
 * @param fileName - The name of the file to download from the
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded.
 */
export async function downloadRawVideo(fileName: string){
    await storage.bucket(rawVideoBucketName)
        .file(fileName)
        .download({destination: `${localRawVideoPath}/${fileName}`})

    console.log(
        `gs://${localRawVideoPath}/${fileName} downloaded to ${localProcessedVideoPath}/${fileName}.`
    )
}

/**
 * 
 * @param fileName - The name of the file to upload from the {@link localProcessedVideoPath}
 * folder into the {@link processedVideoBucketName}.
 * @returns A promise that resolves when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string){
    const bucket = storage.bucket(processedVideoBucketName);
    await bucket.upload(`${processedVideoBucketName}/${fileName}`, {
        destination: fileName
    });

    console.log(`${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}`);

    await bucket.file(fileName).makePublic();
}

/**
 * 
 * @param fileName - The name of the file to delete from the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
export function deleteRawVideo(fileName: string){
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 * 
 * @param fileName - The name of the file to delete from the {@link localProcessedVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
export function deleteProcessedVideo(fileName: string){
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * 
 * @param filePath - The full file path to delete
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)){
            // Efficient method to delete files
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(`Failed to delete file at ${filePath}.`, err);
                    // Using resolve here. May want to consider using reject if visibility necessary.
                    resolve();
                } else {
                    console.log(`File deleted at ${filePath}`);
                    resolve();
                }
            })
        } else {
            console.log(`File not found at ${filePath}. Skipping delete process.`);
            // Using resolve here. May want to consider using reject if visibility necessary.
            resolve();
        }
    })
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * @param dirPath - The full directory path to check.
 */
function ensureDirectoryExistence(dirPath: string){
    // Create directory recursively if it doesn't already exist
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive:true});
        console.log(`Directory created at ${dirPath}`);
    }
}