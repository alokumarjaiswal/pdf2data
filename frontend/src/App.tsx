import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import UploadPage from './pages/UploadPage';
import ExtractPage from './pages/ExtractPage';
import ParserPage from './pages/ParserPage';
import AIParserConfigPage from './pages/AIParserConfigPage';
import StructurePreviewPage from './pages/StructurePreviewPage';
import ParseExecutionPage from './pages/ParseExecutionPage';
import PreviewPage from './pages/PreviewPage';
import ListPage from './pages/ListPage';

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<UploadPage />} />
            <Route path='/extract' element={<ExtractPage />} />
            <Route path='/parse' element={<ParserPage />} />
            <Route path='/aiparser-config' element={<AIParserConfigPage />} />
            <Route path='/structure-preview' element={<StructurePreviewPage />} />
            <Route path='/parse-execution' element={<ParseExecutionPage />} />
            <Route path='/preview/:fileId' element={<PreviewPage />} />
            <Route path='/list' element={<ListPage />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

