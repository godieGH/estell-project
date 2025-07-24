const express = require("express");
const router = express.Router();
require("dotenv").config();
const { authenticateAccess } = require("../middleware/JwtAccessTokenAuth");
const upload = require("../middleware/postsUploadMulterConfig");

const {
  toggleLike,
  getAllLikers,
  getAvatarForLikersFollowed,
  getLikersFollowed,
  getMentionedUser,
  createAPostController,
  updatePostController,
} = require("../controllers/PostsController");

router.put("/:post_id/togglelike", authenticateAccess, toggleLike);

router.get("/:post_id/get/all/likers", authenticateAccess, getAllLikers);

router.get(
  "/:post_id/likers/followed/avatars/",
  authenticateAccess,
  getAvatarForLikersFollowed,
);

router.get("/:post_id/likers/followed/", authenticateAccess, getLikersFollowed);

router.get("/mentioned/user/:id", authenticateAccess, getMentionedUser);

const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const FFMPEG_PATH = process.env.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;
ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    } else {
      console.log(`Successfully deleted file: ${filePath}`);
    }
  });
};

router.post(
  "/upload/",
  authenticateAccess,
  upload.single("media"),
  async (req, res) => {
    const io = req.io;
    const socketId = req.header("X-Socket-ID"); // We'll get the socket ID from a custom header

    if (!socketId) {
      console.error("No socket ID provided in request.");
      return res
        .status(400)
        .json({ error: "Client socket identifier is missing." });
    }

    if (!req.file) {
      console.error("No file uploaded or invalid file type in /upload/.");
      return res
        .status(400)
        .json({ error: "No file uploaded or invalid file type" });
    }

    const inputFilePath = req.file.path;
    const originalFileName = req.file.filename;

    let originalMediaUrl = null;
    let processedMediaUrl = null;
    let processedMediaType = null;
    let thumbnailUrl = null;
    let hlsOutputDir = null;

    try {
      if (req.file.mimetype.startsWith("video/")) {
        processedMediaType = "video";
        const videoId = path.parse(originalFileName).name;
        hlsOutputDir = path.join(__dirname, "../uploads/hls", videoId);
        const thumbnailsDir = path.join(__dirname, "../uploads/thumbnails");

        if (!fs.existsSync(thumbnailsDir))
          fs.mkdirSync(thumbnailsDir, { recursive: true });
        if (!fs.existsSync(hlsOutputDir))
          fs.mkdirSync(hlsOutputDir, { recursive: true });

        const masterPlaylistFileName = `master.m3u8`;
        const masterPlaylistPath = path.join(
          hlsOutputDir,
          masterPlaylistFileName,
        );
        const thumbnailFileName = `${videoId}-thumbnail.jpg`;

        console.log(`Starting HLS conversion for video: ${inputFilePath}`);

        // --- Inform client that HLS processing is starting ---
        io.to(socketId).emit("processing_start", {
          message: "Processing Video...", // More specific message
        });

        // --- HLS Conversion Promise ---
        await new Promise((resolve, reject) => {
          ffmpeg(inputFilePath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-f hls",
              "-hls_time 10",
              "-hls_playlist_type vod",
              "-hls_segment_filename",
              path.join(hlsOutputDir, "segment%03d.ts"),
              "-hls_flags independent_segments",
              "-preset veryfast",
              "-b:v 1500k",
              "-maxrate 1800k",
              "-bufsize 2400k",
              "-vf scale=-2:720",
              "-threads",
              "0",
              "-start_number",
              "0",
            ])
            .output(masterPlaylistPath)
            .on("start", (commandLine) => {
              console.log(
                "FFmpeg HLS conversion started for socket " + socketId,
                commandLine,
              );
            })
            .on("progress", (progress) => {
              // --- EMIT HLS PROGRESS TO THE SPECIFIC CLIENT ---
              if (progress.percent) {
                const percent = Math.round(progress.percent);
                console.log(`FFmpeg HLS progress for ${socketId}: ${percent}%`);
                io.to(socketId).emit("hls_progress", { percent });
              }
            })
            .on("error", (err, stdout, stderr) => {
              console.error("FFmpeg HLS conversion error:", err.message);
              console.log(stdout, stderr);
              // Attempt to clean up in case of error during conversion
              deleteFile(inputFilePath); // Clean up original file
              if (hlsOutputDir && fs.existsSync(hlsOutputDir)) {
                fs.rm(hlsOutputDir, { recursive: true, force: true }, () => {});
              }
              reject(new Error("Video HLS processing failed."));
            })
            .on("end", async () => {
              console.log("Video HLS conversion finished successfully!");

              // --- Thumbnail Generation (remains the same) ---
              try {
                await new Promise((resolveThumb) => {
                  ffmpeg(inputFilePath)
                    .screenshots({
                      timestamps: ["00:00:01"],
                      filename: thumbnailFileName,
                      folder: thumbnailsDir,
                    })
                    .on("end", () => {
                      thumbnailUrl = `/uploads/thumbnails/${thumbnailFileName}`;
                      resolveThumb();
                    })
                    .on("error", (err) => {
                      console.error("Error generating thumbnail:", err.message);
                      resolveThumb(); // Resolve anyway, thumbnail is not critical
                    });
                });
              } catch (thumbErr) {
                console.error(
                  "Caught error during thumbnail generation:",
                  thumbErr,
                );
              }

              processedMediaUrl = `/uploads/hls/${videoId}/${masterPlaylistFileName}`;

              // --- New: Convert segment000.ts to .mp4 ---
              const firstSegmentPath = path.join(hlsOutputDir, "segment000.ts");
              const mp4FileName = `${videoId}.mp4`; // Change to .mp4
              const mp4FilePath = path.join(hlsOutputDir, mp4FileName); // Change to .mp4

              try {
                // Ensure segment000.ts exists before attempting to convert it
                if (!fs.existsSync(firstSegmentPath)) {
                  console.warn(
                    `segment000.ts not found at ${firstSegmentPath}. Skipping MP4 conversion.`,
                  );
                  originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`; // Fallback
                } else {
                  // --- EMIT START OF MP4 CONVERSION ---
                  io.to(socketId).emit("processing_start", {
                    message: "Optimizing video...", // New specific message
                  });

                  await new Promise((resolveMp4) => {
                    // Changed variable names
                    ffmpeg(firstSegmentPath)
                      .outputOptions([
                        "-c:v libx264", // H.264 video codec
                        "-crf 23", // Constant Rate Factor for quality (0-51, lower is better, 23 is good default)
                        "-preset medium", // Encoding preset (ultrafast, superfast, fast, medium, slow, slower, slowest)
                        "-c:a aac", // AAC audio codec
                        "-b:a 128k", // Audio bitrate
                        "-movflags +faststart", // Optimize for web streaming
                      ])
                      .output(mp4FilePath) // Output to .mp4 file
                      .on("end", () => {
                        console.log("MP4 conversion finished successfully!");
                        originalMediaUrl = `/uploads/hls/${videoId}/${mp4FileName}`; // Use .mp4
                        resolveMp4(); // Changed variable name
                      })
                      .on("error", (err, stdout, stderr) => {
                        console.error(
                          "Error during MP4 conversion:",
                          err.message,
                        );
                        console.log(stdout, stderr);
                        // If MP4 fails, fall back to segment000.ts
                        originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`;
                        console.warn(
                          "MP4 conversion failed, falling back to segment000.ts for originalMediaUrl.",
                        );
                        resolveMp4(); // Resolve to continue main flow
                      })
                      .on("progress", (progress) => {
                        if (progress.percent) {
                          const percent = Math.round(progress.percent);
                          console.log(
                            `FFmpeg MP4 progress for ${socketId}: ${percent}%`,
                          );
                          io.to(socketId).emit("mp4_progress", { percent }); // New event for MP4 progress
                        } else if (progress.timemark) {
                          console.log(
                            `FFmpeg MP4 timemark for ${socketId}: ${progress.timemark}`,
                          );
                        }
                      })
                      .run();
                  });
                }
              } catch (mp4Err) {
                // Changed variable name
                console.error(
                  "Caught error during MP4 conversion promise:",
                  mp4Err,
                );
                originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`; // Fallback
              }

              // Clean up the original uploaded video file
              deleteFile(inputFilePath);

              resolve();
            })
            .run();
        });
      } else if (req.file.mimetype.startsWith("image/")) {
        processedMediaType = "image";
        processedMediaUrl = `/uploads/posts/${originalFileName}`;
        originalMediaUrl = `/uploads/posts/${originalFileName}`; // For images, original and processed are the same
      } else {
        // Delete unsupported file type
        deleteFile(inputFilePath);
        return res.status(400).json({ error: "Unsupported file type." });
      }

      if (processedMediaUrl) {
        return res.status(200).json({
          originalMedia: originalMediaUrl,
          mediaUrl: processedMediaUrl,
          mediaType: processedMediaType,
          thumbnailUrl: thumbnailUrl,
        });
      } else {
        // If processedMediaUrl is null, it means something went wrong and the file wasn't processed
        deleteFile(inputFilePath); // Clean up original file if processing failed
        return res.status(500).json({ error: "Failed to generate media URL." });
      }
    } catch (err) {
      console.error("Error during media processing in /upload/ route:", err);
      // Ensure cleanup in case of unhandled errors
      deleteFile(inputFilePath);
      if (hlsOutputDir && fs.existsSync(hlsOutputDir)) {
        fs.rm(hlsOutputDir, { recursive: true, force: true }, () => {});
      }
      return res.status(500).json({
        error: "Server error during media processing.",
        details: err.message,
      });
    }
  },
);

router.post("/create/", authenticateAccess, createAPostController);

router.put("/update/:id", authenticateAccess, updatePostController);

module.exports = router;
