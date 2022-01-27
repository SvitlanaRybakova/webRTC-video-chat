import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { v4 } from "uuid";

import socket from "../../socket";
import ACTIONS from "../../socket/actions";

const Home = () => {
  const [rooms, updateRooms] = useState([]);
  const rootNode = useRef();
  const navigation = useNavigate();

  useEffect(() => {
    socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
      if (rootNode.current) {
      updateRooms(rooms);
      }
    });
  }, []);

  return (
    <div ref={rootNode}>
      <h1>Available Rooms</h1>
      <ul>
        {rooms.map((roomID) => (
          <li key={roomID}>
            {roomID}
            <button
              onClick={() => {
                navigation(`/room/${roomID}`);
              }}
            >
              JOIN ROOM
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          navigation(`/room/${v4()}`);
        }}
      >
        Create New Room
      </button>
    </div>
  );
};

export default Home;
