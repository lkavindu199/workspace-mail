import './assets/css/output.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import ServiceModalPage from './pages/ServiceModalPage'
import About from './pages/About'
import Settings from './pages/Settings'
import RouteResolver from './components/RouteResolver'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <RouteResolver />
      <Routes>
        <Route path="/tabs" element={<App />} />
        <Route path="/modal" element={<ServiceModalPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings setActiveTabId={(id: string) => console.log(id)} activeTabId={''} />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
