import { useRef, useCallback, useEffect } from "react";
import socket from "../socket";
// provide a list with free stun servers adress
import freeice from "freeice";
import ACTIONS from "../socket/actions";
import useStateWithCallback from "./useStateWithCallback";

export const LOCAL_VIDEO = "LOCAL_VIDEO";

export default function useWebRTC(roomId) {
  const [clients, updateClients] = useStateWithCallback([]);

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
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
 
  // create answer 
  useEffect(() => {
    async function setRemoteMedia({
      peerID,
      sessionDescription: remoteDescription,
    }) {
      await peerConnections.current[peerID]?.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type === "offer") {
        const answer = await peerConnections.current[peerID].createAnswer();

        await peerConnections.current[peerID].setLocalDescription(answer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID]?.addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      updateClients((list) => list.filter((c) => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, []);

  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      // check if we already connected to current peer
      if (peerID in peerConnections.current) {
        return console.warn(`Already connected to peer ${peerID}`);
      }
      // create a new peer connection
      peerConnections.current[peerID] = new RTCPeerConnection({
        // adresses a free stun servers
        iceServers: freeice(),
      });

      peerConnections.current[peerID].onicecandidate = (event) => {
        // if we want to create a room (event===candidate) = share our offer to other clients
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;

      peerConnections.current[peerID].ontrack = ({
        streams: [remoteStream],
      }) => {
        tracksNumber++;
        // check that we got a 2 tracks (video & audio)
        if (tracksNumber === 2) {
          tracksNumber = 0;
          //  extracts streams what we got from other users
          addNewClient(peerID, () => {
            if (peerMediaElements.current[peerID]) {
              peerMediaElements.current[peerID].srcObject = remoteStream;
            } else {
              // FIX LONG RENDER IN CASE OF MANY CLIENTS
              let settled = false;
              const interval = setInterval(() => {
                if (peerMediaElements.current[peerID]) {
                  peerMediaElements.current[peerID].srcObject = remoteStream;
                  settled = true;
                }

                if (settled) {
                  clearInterval(interval);
                }
              }, 1000);
            }
          });
        }
      };
      // add localStream to peer connection
      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[peerID].addTrack(
          track,
          localMediaStream.current
        );
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();

        await peerConnections.current[peerID].setLocalDescription(offer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(ACTIONS.ADD_PEER);
    };
  }, []);

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
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVideoElement) {
          localVideoElement.volum = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    }

    // get video and audio from current device
    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomId }))
      .catch((e) => console.error("Error getting userMedia:", e));

    // logout from room if the component has been unmounted
    return () => {
      localMediaStream.current.getTracks().forEach((track) => track.stop());

      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomId]);

  // ref for video node (src)
  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);
  return { clients, provideMediaRef };
}
