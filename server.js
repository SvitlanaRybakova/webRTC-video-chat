// const path = require("path");
// const express = require("express");
// const app = express();
// const server = require("http").createServer(app);
// const io = require("socket.io")(server);
// const ACTIONS = require("./src/socket/actions");
// const { version, validate } = require("uuid");

// console.log("version************", version);
// console.log("validate************", validate);
// const PORT = process.env.PORT || 3001;

// // get all available socket's connection
// function getClientRooms() {
//   const { rooms } = io.sockets.adapter;

//   // exclude rooms created by default (returns only these wich user creates themself)
//   return Array.from(rooms.keys()).filter(
//     (roomID) => validate(roomID) && version(roomID) === 4
//   );
// }

// // if apears a new socket connection, share the information about the with all rooms
// function shareRoomsInfo() {
//   io.emit(ACTIONS.SHARE_ROOMS, {
//     rooms: getClientRooms(),
//   });
// }
// // connect client and server sockets together
// io.on("connection", (socket) => {
//   console.log("Socket connected");
//   // share  info about all available rooms
//   shareRoomsInfo();

//   // an action in case jf user wants to join room
//   socket.on(ACTIONS.JOIN, (config) => {
//     const { room: roomID } = config;

//     // check if the user has been connected earlier
//     const { rooms: joinedRooms } = socket;
//     if (Array.from(joinedRooms).includes(roomID)) {
//       return console.warn("Already joined to room", roomID);
//     }
//     // if a user has not been connected, get all clients who are in this room
//     const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

//     clients.forEach((clientID) => {
//       // send offer to FIRST client (who is already iside room) this client accept offer(not create it)
//       io.to(clientID).emit(ACTIONS.ADD_PEER, {
//         peerID: socket.id,
//         createOffer: false,
//       });

//       // the second user who entered the room (create the offer)
//       socket.emit(ACTIONS.ADD_PEER, {
//         peerID: clientID,
//         createOffer: true,
//       });
//     });

//     // join the room
//     socket.join(roomID);
//     // share information about new room
//     shareRoomsInfo();
//   });

//   function leaveRoom() {
//     // get all rooms
//     const { rooms } = socket;

//     Array.from(rooms).forEach((roomId) => {
//       // get all clients in room
//       const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

//       clients.forEach((clientID) => {
//         // send all clients action to disconnect
//         io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
//           peerID: socket.id,
//         });
//         // disconnect themself
//         socket.emit(ACTIONS.REMOVE_PEER, {
//           peerID: clientID,
//         });
//       });

//       socket.leave(roomId);
//     });

//     shareRoomsInfo();
//   }
//   // if a user decided to leave video-chat
//   socket.on(ACTIONS.LEAVE, leaveRoom);
//   // if socket was emergency disconnected
//   socket.on("disconnecting", leaveRoom);
// });

// server.listen(PORT, () => {
//   console.log("Server Started!");
// });
const path = require("path");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { version, validate } = require("uuid");

const ACTIONS = require("./src/socket/actions");
const PORT = process.env.PORT || 3001;

function getClientRooms() {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter(
    (roomID) => validate(roomID) && version(roomID) === 4
  );
}

function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
}

io.on("connection", (socket) => {
  shareRoomsInfo();

  socket.on(ACTIONS.JOIN, (config) => {
    const { room: roomID } = config;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    clients.forEach((clientID) => {
      io.to(clientID).emit(ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });

    socket.join(roomID);
    shareRoomsInfo();
  });

  function leaveRoom() {
    const { rooms } = socket;

    Array.from(rooms)
      // LEAVE ONLY CLIENT CREATED ROOM
      .filter((roomID) => validate(roomID) && version(roomID) === 4)
      .forEach((roomID) => {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

        clients.forEach((clientID) => {
          io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
            peerID: socket.id,
          });

          socket.emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
          });
        });

        socket.leave(roomID);
      });

    shareRoomsInfo();
  }

  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on("disconnecting", leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });
});

const publicPath = path.join(__dirname, "build");

app.use(express.static(publicPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

server.listen(PORT, () => {
  console.log("Server Started!");
});