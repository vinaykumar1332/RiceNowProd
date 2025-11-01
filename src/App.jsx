import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Home from "./pages/Home/Home";
import Products from "./pages/Products/Products";
import MyOrders from "./pages/MyOrders/MyOrders";
import NotFound from "./pages/NotFound/NotFound";
import Checkout from "./pages/Checkout/Checkout";
import CheckoutSuccess from "./components/CheckoutSuccess/CheckoutSuccess";
import Contact from "./pages/Contact/Contact"; // <-- new import

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/contact" element={<Contact />} /> 
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
