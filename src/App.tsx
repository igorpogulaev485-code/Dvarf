import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CharacterCardPage } from './pages/CharacterCardPage';
import { CharacterListPage } from './pages/CharacterListPage';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { SessionFramePage } from './pages/SessionFramePage';
import { SessionListPage } from './pages/SessionListPage';
import { SettingDetailPage } from './pages/SettingDetailPage';
import { SettingListPage } from './pages/SettingListPage';
import { CharactersProvider } from './store/characters';
import { TableProvider } from './store/table';
import './index.css';

export default function App() {
  return (
    <CharactersProvider>
      <TableProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <Routes>
            <Route path="/" element={<CharacterListPage />} />
            <Route path="/characters/:id" element={<CharacterCardPage />} />
            <Route path="/characters/:id/sheet" element={<CharacterSheetPage />} />
            <Route path="/settings" element={<SettingListPage />} />
            <Route path="/settings/:id" element={<SettingDetailPage />} />
            <Route path="/sessions" element={<SessionListPage />} />
            <Route path="/sessions/:id" element={<SessionFramePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TableProvider>
    </CharactersProvider>
  );
}
