/**
 * CONFIGURACIÓN Y ESTADO GLOBAL DEL AJEDREZ
 */

// Diccionario de piezas y sus iconos
const PIECES_CHAR = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

// Valores para la evaluación de la IA
const VALUES = { p: 10, n: 30, b: 35, r: 50, q: 90, k: 9000 };

// Pesos posicionales para mejorar la estrategia de la IA
const POS_WEIGHTS = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 5, 5, 5, 5, 2, 1],
    [1, 2, 5, 5, 5, 5, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0]
];

// Estado inicial del tablero
let board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
];

// Variables de control de flujo
let turn = 'W'; 
let gameActive = true;
let selected = null;
let enPassantTarget = null; 
let gameStarted = false; 

// Estado para controlar si las piezas se han movido (Crucial para el Enroque)
let movedState = { 
    W_K: false, W_R1: false, W_R8: false, 
    B_K: false, B_R1: false, B_R8: false 
};

// Variables para el nuevo sistema de tiempo (Preparadas para tu mejora)
let timerW = 600; // 10 minutos en segundos
let timerB = 600;