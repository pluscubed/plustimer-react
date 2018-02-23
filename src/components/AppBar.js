// @flow

import { h } from 'preact';
import * as React from '../utils/preact';

import ProfileContainer from '../components/ProfileContainer';
import PuzzleSelect from '../components/PuzzleSelect';

import style from './AppBar.css';

type Props = {};

const AppBar = () => {
  return (
    <header className={style.toolbar}>
      <PuzzleSelect />

      <span className={style.toolbarSpacer} />

      <ProfileContainer />
    </header>
  );
};

export default AppBar;
