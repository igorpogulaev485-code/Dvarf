import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CharacterCardPage } from './pages/CharacterCardPage';
import { CharacterListPage } from './pages/CharacterListPage';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { CharactersProvider } from './store/characters';
import './index.css';

export default function App() {
  return (
    <CharactersProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route path="/" element={<CharacterListPage />} />
          <Route path="/characters/:id" element={<CharacterCardPage />} />
          <Route path="/characters/:id/sheet" element={<CharacterSheetPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CharactersProvider>
  );
}
