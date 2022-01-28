import React from 'react'
import {useParams} from 'react-router-dom'
import useWebRTC from '../../hooks/useWebRTC'
import {LOCAL_VIDEO} from '../../hooks/useWebRTC'

const Room = () => {
const {roomId} = useParams()
const { clients, provideMediaRef } = useWebRTC(roomId);

  return (
    <div>
      <h2>this is room {roomId}</h2>
      {clients.map((clientId) => (
        <div key={clientId}>
          <video
            autoPlay
            playsInline
            muted={clientId === LOCAL_VIDEO}
            ref={(instance) => {
              provideMediaRef(clientId, instance);
            }}
            style={{maxWidth: "500px"}}
          />
        </div>
      ))}
    </div>
  );
}

export default Room
