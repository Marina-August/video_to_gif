import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './App.css';
import HomePage from './pages/Home';


const router = createBrowserRouter([
  {
    path: '/',
    id:'root',
    children:[
        { index: true,
          element: <HomePage/>,
        },
    ]
  },
])


const App=()=> {
  return <RouterProvider router={router} />;
}

export default App;
