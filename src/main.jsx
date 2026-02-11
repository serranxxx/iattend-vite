import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles'
import { BrowserRouter } from 'react-router-dom';
import { IAttend } from './IAttend';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(

  <BrowserRouter>
    <IAttend />
  </BrowserRouter>

);


