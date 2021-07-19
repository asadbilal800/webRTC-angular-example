const https = require("http");
const express = require("express");
const app = express();

const findPartner = [];
const server = https.createServer(app);

const socket = require("socket.io");
server.listen(3000);
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let id;

io.on("connection", (socket) => {
  //send message for communicating with each peer.
  socket.on("send-msg", (body) => {
    console.log("he he");
    console.log(body);
    socket.join(body.roomName);
    io.to(body.roomName).emit(body.roomName, body);
  });

  socket.on("find-partner", (val) => {
    if (findPartner.length !== 0) {
      console.log("second   user");
      id = findPartner.pop();
      console.log("popped  id" + id);
      socket.join(id);
      socket.emit("getting-into-room", id);
      socket.to(id).emit(id, "hello from peer!");
    } else {
      console.log("first user");
      console.log(socket.id);
      findPartner.push(socket.id);
      socket.join(socket.id);
      socket.emit("getting-into-room", socket.id);
    }
  });
});
