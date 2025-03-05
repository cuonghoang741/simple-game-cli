import { HomePage } from './scenes/HomePage';
import { AUTO, Game, Scale } from 'phaser';
import { GAME_INFO } from '../configs/game';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
        width: window.innerWidth*window.devicePixelRatio,
        height: window.innerHeight*window.devicePixelRatio
    },
    title: GAME_INFO.name,
    scene: [
        HomePage,
    ],
    // Enhanced graphics settings
    pixelArt: false, // Set to true for pixel art games
    roundPixels: false, // Prevents pixel interpolation for pixel art
    antialias: true, // Enables anti-aliasing for smoother graphics
    antialiasGL: true, // WebGL specific anti-aliasing
    desynchronized: true, // Reduces input lag
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            fps: 120
        }
    },
    dom: {
        createContainer: true
    },
    render: {
        transparent: false,
        clearBeforeRender: true,
        powerPreference: 'high-performance'
    },
    fps: {
        target: 120,  // Target 120 FPS
        forceSetTimeOut: false
    }
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
