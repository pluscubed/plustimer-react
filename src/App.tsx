import * as React from 'react';
import './App.css';

import CurrentTimer from './containers/CurrentTimer';
import CurrentSolvesSheet from './containers/CurrentSolvesSheet';
import CurrentScramble from './containers/CurrentScramble';
import CurrentTimerAppBar from './containers/CurrentTimerAppBar';

import 'typeface-roboto';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

const App = () => {
  return (
    <MuiThemeProvider>
      <div className="App">
        <CurrentTimerAppBar />

        <CurrentScramble />

        <CurrentTimer />

        <CurrentSolvesSheet />
      </div>
    </MuiThemeProvider>
  );
};

export default App;
