import {useRef, useCallback, useEffect} from 'react'
import socket from "../socket";
import ACTIONS from "../socket/actions";
import useStateWithCallback from "./useStateWithCallback";

export const LOCAL_VIDEO = "LOCAL_VIDEO";

export default function useWebRTC(roomId) {
  const [clients, updateClients] = useStateWithCallback([]);

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO] : null,
  });

  // check clients for the unique value
  const addNewClient = useCallback(
    (newClient, cb) => {
      updateClients((list) => {
        // if a client is unique
        if (!list.includes(newClient)) {
          return [...list, newClient];
        }

        return list;
      }, cb);
    },
    [clients, updateClients]
  );

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });
      // if we got video stream from current screen
      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO]

        if(localVideoElement){
          localVideoElement.volum = 0;
          localVideoElement.srcObject = localMediaStream.current
        }
      });
    }

    // get video and audio from current device
    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomId }))
      .catch((e) => console.error("Error getting userMedia:", e));
  }, [roomId]);

  // ref for video node (src)
  const provideMediaRef = useCallback(
    (id, node) => {
      peerMediaElements.current[id] = node
    },
    [],
  )
   return { clients, provideMediaRef };
}
