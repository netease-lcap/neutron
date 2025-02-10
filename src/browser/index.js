import React from 'react';
import { createRoot } from 'react-dom/client';

import Container from './pages/Container';

const element = document.getElementById('app');
const root = createRoot(element);

root.render(<Container />);