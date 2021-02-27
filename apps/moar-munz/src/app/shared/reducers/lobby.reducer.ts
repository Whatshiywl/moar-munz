import { Lobby } from '@moar-munz/api-interfaces';
import { createReducer, on } from '@ngrx/store';
import { create } from '../actions/lobby.actions';

export const initialState: Lobby = undefined;

const _lobbyReducer = createReducer(
  initialState,
  on(create, state => state)
);

export function lobbyReducer(state: Lobby, action) {
  return _lobbyReducer(state, action);
}
