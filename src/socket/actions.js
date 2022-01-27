const ACTIONS = {
  // join room
  JOIN: "join",
  LEAVE: "leave",
  SHARE_ROOMS: "share-rooms",
  // create a new connection between clients
  ADD_PEER: "add-peer",
  REMOVE_PEER: "remove-peer",
  // transfer the video-audio sream
  RELAY_SDP: "relay-sdp",
  // transfer the ice candidates(physical  connection)
  ICE_CANDIDATE: "ice-candidate",
  SESSION_DESCROPTION: "session-description",
};
module.exports = ACTIONS;
