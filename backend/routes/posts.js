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
const { imageSize } = require('image-size')
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

const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      const audioStream = metadata.streams.find((s) => s.codec_type === "audio");
      const format = metadata.format;

      const getFps = (rFrameRate) => {
        if (!rFrameRate) return null;
        const parts = rFrameRate.split('/');
        if (parts.length === 2) {
          const numerator = parseInt(parts[0], 10);
          const denominator = parseInt(parts[1], 10);
          if (denominator !== 0) {
            return numerator / denominator;
          }
        }
        return null;
      };

      const meta = {
        size: format.size ? parseInt(format.size) : null,
        duration: format.duration ? parseFloat(format.duration) : null,
        bit_rate: format.bit_rate ? parseInt(format.bit_rate) : null,
        format_name: format.format_name || null,
        format_long_name: format.format_long_name || null,
        width: videoStream ? videoStream.width : null,
        height: videoStream ? videoStream.height : null,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
        aspect_ratio: videoStream ? videoStream.display_aspect_ratio : null,
        fps: getFps(videoStream?.r_frame_rate),
        video_codec: videoStream ? videoStream.codec_name : null,
        audio_codec: audioStream ? audioStream.codec_name : null,
      };
      resolve(meta);
    });
  });
};

const getImageMetadata = async (filePath) => {
  try {
    const dimensions = imageSize(fs.readFileSync(filePath));
    const meta = {
      size: fs.statSync(filePath).size,
      width: dimensions.width,
      height: dimensions.height,
    };
    return meta;
  } catch (error) {
    console.error("Error getting image metadata with image-size:", error.message);
    return {
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : null,
      error: "Failed to get image dimensions or metadata."
    };
  }
};


router.post(
  "/upload/",
  authenticateAccess,
  upload.single("media"),
  async (req, res) => {
    const io = req.io;
    const socketId = req.header("X-Socket-ID");

    if (!socketId) {
      return res
        .status(400)
        .json({ error: "Client socket identifier is missing." });
    }

    if (!req.file) {
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
    let mediaMetadata = {};

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

        try {
          mediaMetadata = await getVideoMetadata(inputFilePath);
        } catch (metaErr) {
          console.error("Error getting video metadata:", metaErr.message); // Added console.error
          mediaMetadata = {};
        }

        io.to(socketId).emit("processing_start", {
          message: "Processing Video...",
        });

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
            .on("progress", (progress) => {
              if (progress.percent) {
                const percent = Math.round(progress.percent);
                io.to(socketId).emit("hls_progress", { percent });
              }
            })
              // eslint-disable-next-line no-unused-vars
            .on("error", (err, stdout, stderr) => {
              console.error("FFmpeg HLS processing error:", err.message); 
              deleteFile(inputFilePath);
              if (hlsOutputDir && fs.existsSync(hlsOutputDir)) {
                fs.rm(hlsOutputDir, { recursive: true, force: true }, () => {});
              }
              reject(new Error("Video HLS processing failed."));
            })
            .on("end", async () => {
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
                      console.error("FFmpeg thumbnail error:", err.message); 
                      resolveThumb(); 
                    });
                });
              } catch (thumbErr) {
                console.error("Thumbnail generation error caught in promise.", thumbErr.message); // Improved console.error
              }

              processedMediaUrl = `/uploads/hls/${videoId}/${masterPlaylistFileName}`;

              const firstSegmentPath = path.join(hlsOutputDir, "segment000.ts");
              const mp4FileName = `${videoId}.mp4`;
              const mp4FilePath = path.join(hlsOutputDir, mp4FileName);

              try {
                if (!fs.existsSync(firstSegmentPath)) {
                  originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`;
                } else {
                  io.to(socketId).emit("processing_start", {
                    message: "Optimizing video...",
                  });

                  await new Promise((resolveMp4) => {
                    ffmpeg(firstSegmentPath)
                      .outputOptions([
                        "-c:v libx264",
                        "-crf 23",
                        "-preset medium",
                        "-c:a aac",
                        "-b:a 128k",
                        "-movflags +faststart",
                      ])
                      .output(mp4FilePath)
                      .on("end", () => {
                        originalMediaUrl = `/uploads/hls/${videoId}/${mp4FileName}`;
                        resolveMp4();
                      })
                        // eslint-disable-next-line no-unused-vars
                      .on("error", (err, stdout, stderr) => {
                        console.error("FFmpeg MP4 optimization error:", err.message); 
                        originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`;
                        resolveMp4();
                      })
                      .on("progress", (progress) => {
                        if (progress.percent) {
                          const percent = Math.round(progress.percent);
                          io.to(socketId).emit("mp4_progress", { percent });
                        }
                      })
                      .run();
                  });
                }
              } catch (mp4Err) {
                console.error("MP4 optimization promise error:", mp4Err.message); // Added console.error
                originalMediaUrl = `/uploads/hls/${videoId}/segment000.ts`;
              }

              deleteFile(inputFilePath);
              resolve();
            })
            .run();
        });
      } else if (req.file.mimetype.startsWith("image/")) {
        processedMediaType = "image";
        processedMediaUrl = `/uploads/posts/${originalFileName}`;
        originalMediaUrl = `/uploads/posts/${originalFileName}`;

        try {
          mediaMetadata = await getImageMetadata(inputFilePath);
        } catch (metaErr) {
          console.error("Error getting image metadata:", metaErr.message);
          mediaMetadata = {};
        }
      } else {
        deleteFile(inputFilePath);
        return res.status(400).json({ error: "Unsupported file type." });
      }

      if (processedMediaUrl) {
        return res.status(200).json({
          originalMedia: originalMediaUrl,
          mediaUrl: processedMediaUrl,
          mediaType: processedMediaType,
          thumbnailUrl: thumbnailUrl,
          media_metadata: mediaMetadata,
        });
      } else {
        deleteFile(inputFilePath);
        return res.status(500).json({ error: "Failed to generate media URL." });
      }
    } catch (err) {
      console.error("Overall media processing error:", err.message); // Added console.error
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
