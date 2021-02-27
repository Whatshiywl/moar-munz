import { Match } from '@moar-munz/api-interfaces';
import { createReducer, on } from '@ngrx/store';
import { create } from '../actions/lobby.actions';

export const initialState: Match = undefined;

const _matchReducer = createReducer(
  initialState,
  on(create, state => state)
);

export function matchReducer(state: Match, action) {
  return _matchReducer(state, action);
}
