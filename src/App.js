 import { Route, Routes } from "react-router-dom";
 import HomePage from './pages/home_page'
 import RoomPage from './pages/room_page'

 function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:id" element={<RoomPage />} />
      </Routes>
    </>
  );
}

export default App;
