const express = require("express");
const http = require("http");
require("dotenv").config();
const cors = require("cors");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const port = process.env.SERVER_PORT;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT,
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const { sendMessage } = require("./sockets/");

io.on("connection", (socket) => {
  socket.on("create_room", (payload) => {
    payload.forEach((id) => {
      socket.join(id);
      console.log(`socket with id ${socket.id} joined room ${id}`);
    });
  });

  socket.on('is_typing', ({status, convoId, user}) => {
    //console.log(status, convoId, user)
     socket.to(convoId).emit('user_is', ({status, convoId, user, type: "typing"}))
  })
  
  socket.on('is_recording', ({status, convoId, user}) => {
     socket.to(convoId).emit('user_is', ({status, convoId, user, type: "recording"}))
  })
  
  
  socket.on("read_msg", ({ msgId, convoId }) => {
    io.to(convoId).emit("someone_raed_msg", msgId);
  });

  sendMessage(io, socket);

  console.log(`A user connected with socket ID: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`User with socket ID: ${socket.id} disconnected`);
  });
});

app.set("view engine", "ejs");
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT,
    methods: ["GET", "POST", "OPTIONS", "DELETE", "PATCH", "PUT"],
    credentials: true,
  }),
);

app.use(cookieParser(process.env.COOKIE_SECRET));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: "Too many requests, please try later.",
  skip: (req) => {
    return (
      req.originalUrl.startsWith("/uploads/") ||
      req.originalUrl.startsWith("/uploads/post/")
    );
  },
});
app.use(globalLimiter);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  }),
);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use("/", express.static("public"));
app.use("/people", express.static("public"));
app.use("/profile", express.static("public"));

app.use("/uploads", express.static("uploads"));

app.use("/users", require("./routes/users"));
app.use("/users", require("./routes/people"));
app.use("/posts", require("./routes/posts"));
app.use("/api", require("./routes/api"));

server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
