const multer = require("multer");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

const FFMPEG_PATH = process.env.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;

if (FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
} else {
  console.warn("FFMPEG_PATH is not set in environment variables.");
}

if (FFPROBE_PATH) {
  ffmpeg.setFfprobePath(FFPROBE_PATH);
} else {
  console.warn("FFPROBE_PATH is not set in environment variables.");
}

function generateRandomAlphaNumeric(length = 8) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const configureStorage = (uploadType) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let destinationPath;
      const conversationId = req.body.conversation_id;

      if (!conversationId) {
        console.error("Error: Conversation ID is required for uploads.");
        return cb(new Error("Conversation ID is required for uploads."));
      }

      switch (uploadType) {
        case "attachment":
          destinationPath = path.join(
            __dirname,
            "..",
            "uploads",
            "messages",
            "attachment",
            conversationId,
          );
          break;
        case "voice_note":
          destinationPath = path.join(
            __dirname,
            "..",
            "uploads",
            "messages",
            "voice_notes",
            "original",
            conversationId,
          );
          break;
        case "voice_note_m4a":
          destinationPath = path.join(
            __dirname,
            "..",
            "uploads",
            "messages",
            "voice_notes",
            "m4a",
            conversationId,
          );
          break;
        case "hls_video":
          destinationPath = path.join(
            __dirname,
            "..",
            "uploads",
            "messages",
            "attachment",
            "hls",
            conversationId,
          );
          break;
        default:
          console.error(`Error: Invalid upload type specified: ${uploadType}`);
          return cb(new Error("Invalid upload type specified."));
      }

      fs.mkdir(destinationPath, { recursive: true }, (err) => {
        if (err) {
          console.error(
            `Error creating directory ${destinationPath}: ${err.message}`,
          );
          return cb(err);
        }
        console.log(`Destination set for ${uploadType}: ${destinationPath}`);
        cb(null, destinationPath);
      });
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      let fileNamePrefix;

      switch (uploadType) {
        case "attachment":
          fileNamePrefix = `${req.userId}-msg-${generateRandomAlphaNumeric()}`;
          break;
        case "voice_note":
          fileNamePrefix = `${req.userId}-voice-original-${generateRandomAlphaNumeric()}`;
          break;
        case "voice_note_m4a":
          fileNamePrefix = `${req.userId}-voice-${generateRandomAlphaNumeric()}`;
          break;
        case "hls_video":
          fileNamePrefix = `${req.userId}-video-${generateRandomAlphaNumeric()}`;
          break;
        default:
          fileNamePrefix = `${req.userId}-file-${generateRandomAlphaNumeric()}`;
      }
      const finalFileName = `${fileNamePrefix}-${Date.now()}${ext}`;
      console.log(`Generated filename for ${uploadType}: ${finalFileName}`);
      cb(null, finalFileName);
    },
  });
};

exports.msgUploadAttachment = multer({
  storage: configureStorage("attachment"),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

exports.msgUploadVoiceNote = multer({
  storage: configureStorage("voice_note"),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      console.log(`File filter: Allowed voice note type - ${file.mimetype}`);
      cb(null, true);
    } else {
      console.warn(
        `File filter: Only audio files are allowed for voice notes - ${file.mimetype}`,
      );
      cb(new Error("Only audio files are allowed for voice notes!"));
    }
  },
});

exports.convertAudioToM4a = async function (
  inputPath,
  outputDir,
  outputFileName,
) {
  const outputPath = path.join(outputDir, `${outputFileName}.m4a`);
  console.log(
    `Starting audio conversion to M4A: ${inputPath} -> ${outputPath}`,
  );

  return new Promise((resolve, reject) => {
    fs.mkdir(outputDir, { recursive: true }, (err) => {
      if (err) {
        console.error(
          `Error creating output directory for M4A conversion ${outputDir}: ${err.message}`,
        );
        return reject(
          new Error(
            `Failed to create output directory for M4A: ${err.message}`,
          ),
        );
      }

      ffmpeg(inputPath)
        .audioCodec("aac")
        .audioBitrate("128k")
        .toFormat("mp4")
        .output(outputPath)
        .on("start", function (commandLine) {
          console.log("Spawned Ffmpeg with command: " + commandLine);
        })
        .on("progress", function (progress) {
          console.log("Processing M4A: " + progress.percent + "% done");
        })
        .on("end", () => {
          console.log(`Audio conversion to M4A complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error(
            `Error during audio conversion to M4A (${inputPath}): ${err.message}`,
          );
          reject(new Error(`Failed to convert audio to M4A: ${err.message}`));
        })
        .run();
    });
  });
};

exports.convertVideoToHLS = async function (
  inputPath,
  outputDir,
  outputFileNamePrefix,
) {
  const playlistName = `${outputFileNamePrefix}.m3u8`;
  const playlistPath = path.join(outputDir, playlistName);
  console.log(
    `Starting video conversion to HLS: ${inputPath} -> ${playlistPath}`,
  );

  return new Promise((resolve, reject) => {
    fs.mkdir(outputDir, { recursive: true }, (err) => {
      if (err) {
        console.error(
          `Error creating output directory for HLS conversion ${outputDir}: ${err.message}`,
        );
        return reject(
          new Error(
            `Failed to create output directory for HLS: ${err.message}`,
          ),
        );
      }

      ffmpeg(inputPath)
        .outputOptions([
           "-y",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
          "-f hls",
          "-hls_time 10",
          "-hls_list_size 0",
          `-hls_segment_filename ${path.join(outputDir, `${outputFileNamePrefix}_%03d.ts`)}`,
          "-start_number 0",
        ])
        .output(playlistPath)
        .on("start", function (commandLine) {
          console.log("Spawned Ffmpeg with command: " + commandLine);
        })
        .on("progress", function (progress) {
          console.log(
            "Processing HLS: " +
              progress.percent +
              "% done, " +
              progress.timemark +
              " time",
          );
        })
        .on("end", () => {
          console.log(`Video conversion to HLS complete: ${playlistPath}`);
          resolve(playlistPath);
        })
        .on("error", (err) => {
          console.error(
            `Error during video conversion to HLS (${inputPath}): ${err.message}`,
          );
          reject(new Error(`Failed to convert video to HLS: ${err.message}`));
        })
        .run();
    });
  });
};

exports.zipFile = function (filePath, outputDir, outputFileName) {
  // Removed 'async' from here
  return new Promise((resolve, reject) => {
    // Removed 'async' from the executor here
    const zipFileName = `${outputFileName}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);

    // Ensure the output directory exists
    // Use .then().catch() or an immediately invoked async function if you need to await something *before* setting up the stream
    // For fs.promises.mkdir, it's fine to just await it directly or handle its promise separately.
    // A common pattern is to wrap the async logic inside the Promise with an IIFE or handle the mkdir promise chain.
    // Let's use a try-catch for mkdir for cleaner error handling.
    fs.promises
      .mkdir(outputDir, { recursive: true })
      .then(() => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Sets the compression level.
        });

        output.on("close", () => {
          console.log(archive.pointer() + " total bytes");
          console.log(
            "Archiver has been finalized and the output file descriptor has closed.",
          );
          resolve(zipFilePath);
        });

        archive.on("warning", (err) => {
          if (err.code === "ENOENT") {
            console.warn("Archiver warning:", err);
          } else {
            reject(err); // Propagate other warnings as errors for the Promise
          }
        });

        archive.on("error", (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Append a file from stream
        const fileBasename = path.basename(filePath);
        archive.file(filePath, { name: fileBasename });

        archive.finalize();
      })
      .catch(reject); // Catch any error from mkdir and reject the promise
  });
};




exports.deleteFile = function(filePath) {
  if (!filePath) {
    console.error('deleteFile was called with a null or undefined path.');
    return;
  }
  
  fs.unlink(filePath, (err) => {
    if (err) {
      // Ignore "file not found" errors, as the goal is to ensure the file is gone.
      if (err.code === 'ENOENT') {
        console.log(`File not found, it may have already been deleted: ${filePath}`);
      } else {
        console.error(`Error deleting file: ${filePath}`, err);
      }
    } else {
      console.log(`Successfully deleted file: ${filePath}`);
    }
  });
}
