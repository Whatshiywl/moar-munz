import { Match } from '@moar-munz/api-interfaces';
import { Action, createReducer, on } from '@ngrx/store';
import { create } from '../actions/match.actions';

export const initialState: Match = undefined;

const _matchReducer = createReducer(
  initialState,
  on(create, (state, action) => action['payload'])
);

export function matchReducer(state: Match, action: Action) {
  return _matchReducer(state, action);
}
