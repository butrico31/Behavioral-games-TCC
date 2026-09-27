export enum GameType {
  ROULETTE = 'roulette',
  PRISONER = 'prisoner',
}

export interface GameConfig {
  name: string;
  description: string;
  redirectUrl: string;
}

export const GAMES_CONFIG: Record<GameType, GameConfig> = {
  [GameType.ROULETTE]: {
    name: 'Roleta de Apostas',
    description: 'Um jogo de apostas no estilo roleta',
    redirectUrl: 'https://roulette-game.example.com',
  },
  [GameType.PRISONER]: {
    name: 'Dilema do Prisioneiro',
    description: 'Um jogo comportamental baseado na teoria clássica do Dilema do Prisioneiro',
    redirectUrl: 'http://localhost:3001',
  },
};


export function getGameRedirectUrl(gameType: GameType, sessionCode: string): string {
  const baseUrl = GAMES_CONFIG[gameType].redirectUrl;
  return `${baseUrl}?session=${sessionCode}`;
}


export function getAllGames() {
  return Object.entries(GAMES_CONFIG).map(([key, config]) => ({
    id: key,
    ...config,
  }));
}


export function getGameInfo(gameType: GameType) {
  return GAMES_CONFIG[gameType] || null;
}
