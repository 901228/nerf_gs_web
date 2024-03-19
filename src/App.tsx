import React, { useRef, useState, useEffect } from 'react';
// import logo from './logo.svg';
import './App.css';
import { useWindowSize } from "@uidotdev/usehooks";
import Button from '@mui/material/Button';
import ModelViewer from './pages/ModelViewer/ModelViewer';
import { Route, Routes, Link, BrowserRouter as Router } from "react-router-dom";
import Home from './pages/HomePage/Home';
import ProductPage from './pages/ProductPage';
import NavBar from './components/navbar';

function App() {
  
  return (
    <>
      <NavBar />
      <Routes>
        {/* <Route path='/' element={ <Home modelName={modelName} setModelName={setModelName}/>} /> */}
        {/* <Route path='/' element={ <ModelViewer />}/> */}
        <Route path='/' element={ <Home /> } />
        <Route path='/product' element={ <ProductPage /> } />
        <Route path='*' element={<h1>Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
