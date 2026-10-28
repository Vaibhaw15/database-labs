import { useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import LabView from './components/LabView.jsx';
import { findLab } from './data/labs.js';

// Simple routing with the URL hash:
//   #         -> home screen with all labs
//   #udemy    -> the Udemy lab
const currentRoute = () => window.location.hash.replace(/^#\/?/, '');

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHash = () => { setRoute(currentRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const lab = findLab(route);
  return lab ? <LabView key={lab.id} lab={lab} /> : <Home />;
}
