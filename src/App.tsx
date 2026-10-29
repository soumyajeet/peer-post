import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './components/Login'
import Home from './components/Home';
import Post from './components/Post';

function App() {

  return (
    <BrowserRouter>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/post/:postId" element={<Post />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
