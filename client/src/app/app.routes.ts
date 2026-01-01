import { Routes } from '@angular/router';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameTableComponent } from './components/game-table/game-table.component';

export const routes: Routes = [
  { path: '', component: LobbyComponent },
  { path: 'game', component: GameTableComponent },
  { path: '**', redirectTo: '' }
];
