import React from 'react';
import { createRoot } from 'react-dom/client';

import Container from './pages/Container';

const element = document.getElementById('app');
const root = createRoot(element);

(() => {
  const platform = electron?.platform?.();

  platform && document.body.setAttribute('data-platform', platform);
})();

root.render(<Container />);
