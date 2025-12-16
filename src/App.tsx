import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import DrawingCanvas from './DrawingCanvas';
import HomePage from './HomePage';
  import DrawingCanvas from "./DrawingCanvas";
import GlobalChat from "./components/GlobalChat";

function App() {
  return (
    <Router>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/draw/:id" element={
             <div className="app-layout">
            <div className="canvas-container">
                <DrawingCanvas />
            </div>

            <div className="chat-container">
                <GlobalChat />
            </div>
            </div>
            
            
            } />
        </Routes>
      </main>
    </Router>
  )
}
