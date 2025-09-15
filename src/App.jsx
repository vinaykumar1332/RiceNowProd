// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Home from "./pages/Home/Home"; 
import MyOrders from "./pages/MyOrders/MyOrders";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/orders" element={<MyOrders />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
