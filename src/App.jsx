import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AddExpense from "./pages/AddExpense";
import Movements from "./pages/Movements";
import EditExpense from "./pages/EditExpense";
import Piggybanks from "./pages/Piggybanks";
import Emergency from "./pages/Emergency";
import Savings from "./pages/Savings";
import Months from "./pages/Months";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/edit/:id" element={<EditExpense />} />
        <Route path="/huchas" element={<Piggybanks />} />
        <Route path="/imprevisto" element={<Emergency />} />
        <Route path="/ahorro" element={<Savings />} />
        <Route path="/meses" element={<Months />} />
      </Routes>
    </BrowserRouter>
  );
}
