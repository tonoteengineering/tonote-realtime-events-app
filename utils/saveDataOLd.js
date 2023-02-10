import { Blob, Buffer } from "buffer";
import { mkdir, open, unlink, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
// import AWS from "aws-sdk";

import { path } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(path);

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

const __dirname = dirname(fileURLToPath(import.meta.url));

export const saveData = async (data, title) => {
  const videoPath = join(__dirname, "../video");

  //   const dirName = new Date().toLocaleDateString().replace(/\./g, "_");
  //   const dirPath = `${videoPath}/${dirName}`;
  const dirPath = `${videoPath}/`;

  const fileName = `${title}.webm`;
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
        // const params = {
        //   Bucket: process.env.AWS_BUCKET_NAME,
        //   Key: `videofile.jpg`,
        //   // Key: `${filename}.jpg`,
        //   Body: finalFilePath,
        // };
        // s3.upload(params, (err, data) => {
        //   if (err) {
        //     reject(err);
        //   }
        //   resolve(data.Location);
        // });
        await unlink(tempFilePath);
        console.log(`*** File ${fileName} created`);
      })
      .save(finalFilePath, dirPath);
  } catch (e) {
    console.log("*** saveData", e);
  }
};
