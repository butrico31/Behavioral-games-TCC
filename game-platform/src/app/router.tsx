import { createBrowserRouter } from 'react-router-dom'
import { PlayLandingPage } from '../modules/play/pages/PlayLandingPage'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { RegisterPage } from '../modules/auth/pages/RegisterPage'
import { VerifyEmailPage } from '../modules/auth/pages/VerifyEmailPage'
import { SessionsPage } from '../modules/game-session/pages/SessionsPage'
import { CreateSessionPage } from '../modules/game-session/pages/CreateSessionPage'
import { MatchLobbyPage } from '../modules/game-session/pages/MatchLobbyPage'
import { MatchPlayPage } from '../modules/game-session/pages/MatchPlayPage'
import { ReportsPage } from '../modules/reports/pages/ReportsPage'
import { SessionMatchesPage } from '../modules/reports/pages/SessionMatchesPage'
import { MatchDetailPage } from '../modules/reports/pages/MatchDetailPage'
import { RouletteGamePage } from '../modules/roulette/pages/RouletteGamePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NotFoundPage } from './components/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PlayLandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/sessions',
    element: (
      <ProtectedRoute>
        <SessionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create-session',
    element: (
      <ProtectedRoute>
        <CreateSessionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/:sessionId',
    element: (
      <ProtectedRoute>
        <SessionMatchesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/:sessionId/matches/:matchId',
    element: (
      <ProtectedRoute>
        <MatchDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/roulette/game',
    element: <RouletteGamePage />,
  },
  {
    path: '/partida/:sessionId',
    element: <MatchLobbyPage />,
  },
  {
    path: '/partida/:sessionId/jogar',
    element: <MatchPlayPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
