import { Lobby } from '@moar-munz/api-interfaces';
import { Action, createReducer, on } from '@ngrx/store';
import { create } from '../actions/lobby.actions';

export const initialState: Lobby = undefined;

const _lobbyReducer = createReducer(
  initialState,
  on(create, (state, action) => action['payload'])
);

export function lobbyReducer(state: Lobby, action: Action) {
  return _lobbyReducer(state, action);
}
