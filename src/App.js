import React from "react";
import { Routes, Route, HashRouter } from "react-router-dom";
import Login from "./components/Login";
import Callback from "./components/Callback";
import Translate from "./components/Translate/Translate";
import Changed from "./components/Changed";
import Branches from "./pages/Branches";
import NavBarTranslate from "./components/NavBar/NavBarTranslate";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App = () => {
  return (
    <HashRouter>
      <NavBarTranslate />
      <br></br>
      <div className="App container">
        <div className="row justify-content-center">
          <Routes>
            <Route path="/callback" element={<Callback />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/changed" element={<Changed />} />
            <Route path="/" element={<Login />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
