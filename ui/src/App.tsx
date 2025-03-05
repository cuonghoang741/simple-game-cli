import { useEffect } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from './game/config';
import './App.css';

function App() {
    useEffect(() => {
        const game = new Phaser.Game(gameConfig);
        return () => {
            game.destroy(true);
        };
    }, []);

    return (
        <div className="App">
            <div id="game"></div>
        </div>
    );
}

export default App;
