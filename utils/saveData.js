import { Blob, Buffer } from "buffer";
import { mkdir, open, unlink, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import AWS from "aws-sdk";
import { path } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

ffmpeg.setFfmpegPath(path);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const saveToAWs = async (file) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `videofile.webm`,
    Body: fs.createReadStream(file),
  };
  s3.upload(params, function (s3Err, data) {
    if (s3Err) throw s3Err;
    console.log(`File uploaded successfully at ${data.Location}`);
  });
};

const __dirname = dirname(fileURLToPath(import.meta.url));

export const saveData = async (data, username) => {
  const videoPath = join(__dirname, "../video");

  const dirPath = `${videoPath}/`;

  const fileName = `${Date.now()}-${username}.webm`;
  const tempFilePath = `${dirPath}/temp-${fileName}`;
  const finalFilePath = `${dirPath}/${fileName}`;

  let fileHandle;

  try {
    fileHandle = await open(dirPath);
  } catch {
    await mkdir(dirPath);
  } finally {
    if (fileHandle) {
      fileHandle.close();
    }
  }

  try {
    const videoBlob = new Blob(data, {
      type: "video/webm",
    });
    const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());

    await writeFile(tempFilePath, videoBuffer);

    ffmpeg(tempFilePath)
      .outputOptions([
        "-c:v libvpx-vp9",
        "-c:a copy",
        "-crf 60",
        "-b:v 0",
        "-vf scale=1600:900",
      ])
      .on("end", async () => {
        await saveToAWs(finalFilePath);
        await unlink(tempFilePath);
        await unlink(finalFilePath);
        console.log(`*** File ${fileName} created`);
      })
      .save(finalFilePath, dirPath);
  } catch (e) {
    console.log("*** saveData", e);
  }
};
