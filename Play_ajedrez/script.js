// --- MOTOR DE AJEDREZ PROFESIONAL

let evaluationCount = 0;
let whiteSeconds = 600;
let blackSeconds = 600;
let gameStarted = true; // Asegúrate de controlar esto con el estado de tu partida
let currentPlayer = 'W'; // 'W' para blancas, 'B' para negras
let aiThinking = false; // Evita que la IA se ejecute en paralelo

// --- 1. REFERENCIAS AL DOM ---
const boardEl = document.getElementById('chess-board');
const statusEl = document.getElementById('status-box');
const historyEl = document.getElementById('move-history');

const MAX_EVALUATIONS = 8000;

window.onload = () => {
    updateUI();
    // startTimers(); <--- ¡BORRA ESTA LÍNEA!
};
// --- FUNCIONES DE UTILIDAD ---
function findKing(color, b) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (color === 'W' && p === 'K') return { r, c };
            if (color === 'B' && p === 'k') return { r, c };
        }
    }
    return null;
}

function isSquareAttacked(r, c, attackerColor, b) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = b[i][j];
            if (piece && (piece === piece.toUpperCase() ? 'W' : 'B') === attackerColor) {
                const moves = getPseudoLegalMoves(i, j, b, true);
                if (moves.some(m => m.r === r && m.c === c)) return true;
            }
        }
    }
    return false;
}

// --- LOGICA DE VALIDACION ---

function isCheck(color, b) {
    const kingPos = findKing(color, b);
    if (!kingPos) return false;
    const oppColor = color === 'W' ? 'B' : 'W';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = b[r][c];
            if (piece && (piece === piece.toUpperCase()) === (oppColor === 'W')) {
                const moves = getPseudoLegalMoves(r, c, b, true);
                if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) return true;
            }
        }
    }
    return false;
}

// --- 3. LÓGICA DE MOVIMIENTOS ---
function getPseudoLegalMoves(r, c, b, ignoreCastling = false) {
    const moves = [];
    const piece = b[r][c];
    if (!piece) return moves;
    const isW = piece === piece.toUpperCase();
    const type = piece.toLowerCase();

    const addMove = (tr, tc) => {
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
        const target = b[tr][tc];
        if (!target) { moves.push({ r: tr, c: tc }); return true; }
        if ((target === target.toUpperCase()) !== isW) { moves.push({ r: tr, c: tc }); return false; }
        return false;
    };

    switch (type) {
        case 'p':
            const dir = isW ? -1 : 1;
            // Avance simple
            if (r + dir >= 0 && r + dir <= 7 && !b[r + dir][c]) {
                moves.push({ r: r + dir, c: c });
                // Avance doble inicial
                if ((isW ? r === 6 : r === 1) && !b[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c: c });
            }
            // Capturas
            [-1, 1].forEach(dc => {
                let tc = c + dc;
                if (tc >= 0 && tc <= 7 && r + dir >= 0 && r + dir <= 7) {
                    let target = b[r + dir][tc];
                    if (target && (target === target.toUpperCase()) !== isW) moves.push({ r: r + dir, c: tc });
                }
            });
            break;
        case 'r': // Torre
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(d => {
                for (let i = 1; i < 8; i++) {
                    if (!addMove(r + d[0] * i, c + d[1] * i)) break;
                    if (b[r + d[0] * i][c + d[1] * i]) break;
                }
            });
            break;
        case 'n': // Caballo
            [[-2, 1], [-2, -1], [2, 1], [2, -1], [-1, 2], [-1, -2], [1, 2], [1, -2]].forEach(d => addMove(r + d[0], c + d[1]));
            break;
        case 'b': // Alfil
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                for (let i = 1; i < 8; i++) {
                    if (!addMove(r + d[0] * i, c + d[1] * i)) break;
                    if (b[r + d[0] * i][c + d[1] * i]) break;
                }
            });
            break;
        case 'q': // Reina
            [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                for (let i = 1; i < 8; i++) {
                    if (!addMove(r + d[0] * i, c + d[1] * i)) break;
                    if (b[r + d[0] * i][c + d[1] * i]) break;
                }
            });
            break;
        case 'k': // Rey
            [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => addMove(r + d[0], c + d[1]));

            // --- LÓGICA DE ENROQUE ---
            if (!ignoreCastling) {
                // BLANCAS
                if (isW && !movedState.W_K && !isCheck('W', b)) {
                    // Enroque Corto (h1)
                    if (!movedState.W_R8 && !b[7][5] && !b[7][6]) {
                        moves.push({ r: 7, c: 6, special: 'castling' });
                    }
                    // Enroque Largo (a1)
                    if (!movedState.W_R1 && !b[7][1] && !b[7][2] && !b[7][3]) {
                        moves.push({ r: 7, c: 2, special: 'castling' });
                    }
                }
                // NEGRAS ✅ CORREGIDO
                if (!isW && !movedState.B_K && !isCheck('B', b)) {
                    // Enroque Corto (h8)
                    if (!movedState.B_R8 && !b[0][5] && !b[0][6]) {
                        moves.push({ r: 0, c: 6, special: 'castling' });
                    }
                    // Enroque Largo (a8)
                    if (!movedState.B_R1 && !b[0][1] && !b[0][2] && !b[0][3]) {
                        moves.push({ r: 0, c: 2, special: 'castling' });
                    }
                }
            }
            break;
    }
    return moves;
}

// Filtra movimientos que dejarían al propio rey en jaque
function getLegalMoves(color, b) {
    const legals = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = b[r][c];
            if (piece && (piece === piece.toUpperCase()) === (color === 'W')) {
                const pseudos = getPseudoLegalMoves(r, c, b);
                pseudos.forEach(m => {
                    const tempBoard = b.map(row => [...row]);
                    tempBoard[m.r][m.c] = tempBoard[r][c];
                    tempBoard[r][c] = '';
                    if (!isCheck(color, tempBoard)) legals.push({ fR: r, fC: c, tR: m.r, tC: m.c, special: m.special });
                });
            }
        }
    }
    return legals;
}

// ✅ FUNCIÓN FALTANTE - Simula un movimiento en el tablero
function makeSimulatedMove(b, move) {
    const tempBoard = b.map(row => [...row]);
    const piece = tempBoard[move.fR][move.fC];

    if (move.special === 'castling') {
        if (move.tC === 6) { // Corto
            tempBoard[move.fR][5] = tempBoard[move.fR][7];
            tempBoard[move.fR][7] = '';
        } else if (move.tC === 2) { // Largo
            tempBoard[move.fR][3] = tempBoard[move.fR][0];
            tempBoard[move.fR][0] = '';
        }
    }

    tempBoard[move.tR][move.tC] = piece;
    tempBoard[move.fR][move.fC] = '';
    return tempBoard;
}

// --- 4. EJECUCIÓN DE JUGADAS ---
function executeMove(fR, fC, tR, tC, special) {
    const piece = board[fR][fC];

    if (!piece) {
        console.error('❌ Movimiento inválido: No hay pieza en', fR, fC);
        return;
    }

    // Mover la Torre si es Enroque
    if (special === 'castling') {
        if (tC === 6) { // Corto
            board[fR][5] = board[fR][7];
            board[fR][7] = '';
        } else if (tC === 2) { // Largo
            board[fR][3] = board[fR][0];
            board[fR][0] = '';
        }
        playSound('enroque');
    }

    const isCaptureMove = board[tR][tC] !== '';

    // Actualizar estados de movimiento
    if (piece === 'K') movedState.W_K = true;
    if (piece === 'k') movedState.B_K = true;
    if (piece === 'R' && fC === 7) movedState.W_R8 = true;
    if (piece === 'R' && fC === 0) movedState.W_R1 = true;
    if (piece === 'r' && fC === 7) movedState.B_R8 = true;
    if (piece === 'r' && fC === 0) movedState.B_R1 = true;

    board[tR][tC] = piece;
    board[fR][fC] = '';

    if (!special) {
        if (isCaptureMove) {
            playSound('capture');
        } else {
            playSound('move');
        }
    }

    // Registrar movimiento en historial
    const moveNotation = String.fromCharCode(65 + fC) + (8 - fR) + String.fromCharCode(65 + tC) + (8 - tR);
    const entry = document.createElement('div');
    entry.className = 'move-history';
    entry.textContent = moveNotation;
    historyEl.appendChild(entry);

    // Comprobar promoción antes de cambiar turno
    if (piece.toLowerCase() === 'p') {
        checkPromotion(tR, tC, piece === piece.toUpperCase() ? 'W' : 'B');
        return; // checkPromotion se encarga de cambiar el turno
    }

    // Cambiar turno
    turn = turn === 'W' ? 'B' : 'W';
    currentPlayer = turn;
    firstMoveCompleted = true; // ✅ Marcar que ya empezó la partida

    updateUI();

    // Si ahora es turno de la IA, iniciarla
    if (turn === 'B' && gameActive) {
        setTimeout(() => {
            requestAnimationFrame(() => {
                aiBrain();
            });
        }, 50);
    }
}


function updateUI() {
    boardEl.innerHTML = '';
    const checkPos = isCheck(turn, board) ? findKing(turn, board) : null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'white-sq' : 'black-sq'}`;
            const piece = board[r][c];

            if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
            if (checkPos && checkPos.r === r && checkPos.c === c) sq.classList.add('check-warning');

            if (piece) {
                sq.textContent = PIECES_CHAR[piece];
                sq.classList.add(piece === piece.toUpperCase() ? 'p-white' : 'p-black');
            }

            sq.onclick = () => {
                if (!gameActive || turn !== 'W') return;
                if (document.querySelector('.promotion-modal')) return;

                if (selected) {
                    const moves = getLegalMoves('W', board);
                    const move = moves.find(m => m.fR === selected.r && m.fC === selected.c && m.tR === r && m.tC === c);

                    if (move) {
                        executeMove(move.fR, move.fC, move.tR, move.tC, move.special);
                        selected = null;
                        if (!isPromotionPending(move.tR, move.tC, 'W')) {
                            statusEl.textContent = "IA PENSANDO...";
                        }
                    } else if (piece && piece === piece.toUpperCase()) {
                        // Reclicó otra pieza propia → redirigir selección
                        selected = { r, c };
                        updateUI();
                    } else {
                        selected = null;
                        updateUI();
                    }
                } else if (piece && piece === piece.toUpperCase()) {
                    selected = { r, c };
                    updateUI();
                }
            };

            boardEl.appendChild(sq);
        }
    }

    const legalMoves = getLegalMoves(turn, board);
    if (legalMoves.length === 0) {
        gameActive = false;
        if (isCheck(turn, board)) {
            statusEl.textContent = turn === 'W' ? "¡JAQUE MATE! DERROTA" : "¡JAQUE MATE! ¡GANASTE!";
            playSound('win');
        } else {
            statusEl.textContent = "TABLAS - AHOGADO";
        }
    } else {
        statusEl.textContent = turn === 'W' ? "TU TURNO" : "IA PENSANDO...";
    }
}

// ================================================================
// MOTOR IA v3 — Minimax + Poda Alfa-Beta + Tablas PST + MVV-LVA
// ================================================================

// --- TABLAS DE POSICIÓN (Piece-Square Tables) ---
// Perspectiva NEGRAS (índice [r][c] directo). Para blancas se invierte con [7-r][c].
const PST = {
    p: [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [78, 83, 86, 73,102, 82, 85, 90],
        [ 7, 29, 21, 44, 40, 31, 44,  7],
        [-17, 16, -2, 15, 14,  0, 15,-13],
        [-26,  3, 10,  9,  6,  1,  0,-23],
        [-22, 9,  5,-11,-10,-2,  3,-19],
        [-31, 8, -7,-37,-36,-14,  3,-31],
        [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-66,-53,-75,-75,-10,-55,-58,-70],
        [-3,-6,100,-36, 4,-14, 62, -4],
        [10, 67, 1, 74, 73, 27, 62, -2],
        [24, 24, 45, 37, 33, 41, 25, 17],
        [-1, 5, 31, 21, 22, 35,  2,  0],
        [-18, 10, 13, 22, 18, 15, 11,-14],
        [-23,-15, 2, 0,  2,  0,-23,-20],
        [-74,-23,-26,-24,-19,-35,-22,-69]
    ],
    b: [
        [-59,-78,-82,-76,-23,-107,-37,-50],
        [-11, 20, 35,-42,-39, 31, 2, -22],
        [-9, 39, -32, 41, 52, -10, 28, -14],
        [25, 17, 20, 34, 26, 25, 15, 10],
        [13, 10, 17, 23, 17, 16,  0,  7],
        [14, 25,  24, 15,  8, 25, 20, 15],
        [19, 20, 11,  6,  7,  6, 20, 16],
        [-7, 2,-15,-12,-14,-15,-10,-10]
    ],
    r: [
        [35, 29, 33,  4, 37, 33, 56, 50],
        [55, 29, 56, 67, 55, 62, 34, 60],
        [19, 35, 28, 33, 45, 27, 25, 15],
        [ 0,  5, 16, 13, 18, -4, -9, -6],
        [-28,-35,-16,-21,-13,-29,-46,-30],
        [-42,-28,-42,-25,-25,-35,-26,-46],
        [-53,-38,-31,-26,-29,-43,-44,-53],
        [-30,-24,-18,  5, -2,-18,-31,-32]
    ],
    q: [
        [ 6, 1, -8,-104, 69, 24, 88, 26],
        [14, 32, 60, -10, 20, 76, 57, 24],
        [-2, 43, 32, 60, 72, 63, 57, 36],
        [ 1, -16, 22, 17, 25, 20, -13, -6],
        [-14,-15,  2, -5,  2,-15,-17,-14],
        [-22,-17,-19,-11,-16,-19,-22,-22],
        [-20,-7,-4,4,-5,-6,-7,-23],
        [-33,-28,-22,-43,-5,-32,-20,-41]
    ],
    k_mg: [  // Rey en medio juego — quiere estar en la esquina
        [-73,-41,-72,-100,-100,-72,-41,-73],
        [-53,-40,-62,-72,-72,-63,-46,-64],
        [-34,-22,-44,-46,-46,-43,-30,-36],
        [-27,-27,-34,-43,-43,-35,-27,-27],
        [-19,-13,-28,-34,-34,-28,-13,-19],
        [ -9,  3,-12,-23,-23,-12,  3, -9],
        [ 20, 23,  2, -5, -5,  2, 23, 20],
        [ 20, 38, 22, -7, -7, 22, 38, 20]
    ],
    k_eg: [  // Rey en final de partida — quiere estar en el centro
        [-53,-34,-21,-11,-28,-14,-24,-43],
        [-27,-11,  4, 13, 14,  4,-5,-17],
        [-19, -3, 11, 21, 23, 11,  1,-9],
        [-18, -4,  8, 22, 21,  9,-4,-15],
        [-15, -7,  0, 17, 14,  2,-5,-18],
        [-20,-10,  4,  8,  7, -1,-8,-19],
        [-35,-22, -4,  0,  0, -5,-22,-35],
        [-55,-43,-30,-20,-20,-30,-43,-55]
    ]
};

// Valores de piezas (centipawns)
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// MVV-LVA (Most Valuable Victim - Least Valuable Attacker) para ordenar capturas
const MVV_LVA = [
    //      P    N    B    R    Q    K
    /* P */ [105, 205, 305, 405, 505, 605],
    /* N */ [104, 204, 304, 404, 504, 604],
    /* B */ [103, 203, 303, 403, 503, 603],
    /* R */ [102, 202, 302, 402, 502, 602],
    /* Q */ [101, 201, 301, 401, 501, 601],
    /* K */ [100, 200, 300, 400, 500, 600]
];
const PIECE_IDX = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

let nodeCount = 0;
const MAX_NODES = 120000;

// Evaluación estática de la posición
function evaluateBoard(b) {
    let score = 0;
    let whiteMat = 0, blackMat = 0;
    let totalPieces = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p) continue;
            totalPieces++;
            const isBlack = p === p.toLowerCase();
            const type = p.toLowerCase();
            const val = PIECE_VALUES[type] || 0;
            if (isBlack) blackMat += val; else whiteMat += val;
        }
    }

    const isEndgame = (whiteMat + blackMat) < 3200; // Sin damas o poco material

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p) continue;
            const isBlack = p === p.toLowerCase();
            const type = p.toLowerCase();
            const val = PIECE_VALUES[type] || 0;
            const sign = isBlack ? 1 : -1;

            score += sign * val;

            // Bonus posicional PST
            let pst = 0;
            if (type === 'k') {
                const table = isEndgame ? PST.k_eg : PST.k_mg;
                pst = isBlack ? table[r][c] : table[7-r][c];
            } else if (PST[type]) {
                pst = isBlack ? PST[type][r][c] : PST[type][7-r][c];
            }
            score += sign * pst;
        }
    }

    // Penalizar por estar en jaque (para búsqueda más agresiva)
    if (isCheck('B', b)) score -= 30;
    if (isCheck('W', b)) score += 30;

    return score;
}

// Ordena movimientos para maximizar la poda alfa-beta
// Orden: jaque mate forzado > capturas MVV-LVA > jaque > resto
function orderMoves(moves, b) {
    return moves.map(m => {
        let priority = 0;
        const victim = b[m.tR][m.tC];
        const attacker = b[m.fR][m.fC];

        if (victim) {
            const vi = PIECE_IDX[victim.toLowerCase()] || 0;
            const ai = PIECE_IDX[attacker.toLowerCase()] || 0;
            priority = 10000 + MVV_LVA[ai][vi];
        }

        // Bonus por mover hacia el centro
        const centerBonus = (3.5 - Math.abs(m.tC - 3.5)) + (3.5 - Math.abs(m.tR - 3.5));
        priority += centerBonus;

        return { move: m, priority };
    }).sort((a, b) => b.priority - a.priority).map(x => x.move);
}

// Minimax con poda alfa-beta completa
function minimax(b, depth, alpha, beta, isMaximizing) {
    nodeCount++;
    if (nodeCount > MAX_NODES) return evaluateBoard(b);
    if (depth <= 0) return evaluateBoard(b);

    const side = isMaximizing ? 'B' : 'W';
    const rawMoves = getLegalMoves(side, b);

    if (rawMoves.length === 0) {
        if (isCheck(side, b)) {
            // Jaque mate: penalizar más si ocurre antes (depth mayor = más rápido)
            return isMaximizing ? -20000 - depth * 100 : 20000 + depth * 100;
        }
        return 0; // Tablas
    }

    const moves = orderMoves(rawMoves, b);

    if (isMaximizing) {
        let best = -Infinity;
        for (const m of moves) {
            const score = minimax(makeSimulatedMove(b, m), depth - 1, alpha, beta, false);
            if (score > best) best = score;
            if (best > alpha) alpha = best;
            if (beta <= alpha) break; // Poda beta
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            const score = minimax(makeSimulatedMove(b, m), depth - 1, alpha, beta, true);
            if (score < best) best = score;
            if (best < beta) beta = best;
            if (beta <= alpha) break; // Poda alfa
        }
        return best;
    }
}

// Motor principal de la IA — búsqueda iterativa por profundidad
function aiBrain() {
    if (!gameActive) return;
    if (aiThinking) return;
    aiThinking = true;
    nodeCount = 0;

    const moves = getLegalMoves('B', board);
    if (moves.length === 0) {
        gameActive = false;
        statusEl.textContent = isCheck('B', board) ? "¡JAQUE MATE! ¡GANASTE!" : "TABLAS — AHOGADO";
        if (isCheck('B', board)) playSound('win');
        aiThinking = false;
        return;
    }

    // Contar material para decidir profundidad
    let totalPieces = 0;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (board[r][c]) totalPieces++;

    // Profundidad real según fase — siempre mínimo 4 para detectar mates
    const depth = totalPieces <= 8 ? 6      // Final: muy profundo
                : totalPieces <= 14 ? 5     // Medio juego tardío
                : moves.length <= 15 ? 5    // Posición táctica
                : 4;                        // Apertura / medio juego

    // Ordenar capturas primero para búsqueda root más eficiente
    const ordered = orderMoves(moves, board);

    let bestMove = ordered[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const m of ordered) {
        if (nodeCount > MAX_NODES) break;
        const score = minimax(makeSimulatedMove(board, m), depth - 1, alpha, beta, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
            if (score > alpha) alpha = score;
        }
    }

    const piece = board[bestMove.fR][bestMove.fC];
    console.log(`🤖 IA d=${depth} nodos=${nodeCount} score=${bestScore} | ${PIECES_CHAR[piece]} ${String.fromCharCode(65+bestMove.fC)}${8-bestMove.fR}→${String.fromCharCode(65+bestMove.tC)}${8-bestMove.tR}`);

    aiThinking = false;
    executeMove(bestMove.fR, bestMove.fC, bestMove.tR, bestMove.tC, bestMove.special);
}


// --- INTERFAZ DE USUARIO ---

// --- CONTROL DE ESTADO ---
function verificarFinPartida() {
    const sinMovimientosW = getLegalMoves('W', board).length === 0;
    const sinMovimientosB = getLegalMoves('B', board).length === 0;
    if (sinMovimientosW) {
        gameActive = false;
        statusEl.textContent = isCheck('W', board) ? "¡JAQUE MATE! La IA te ganó" : "TABLAS - AHOGADO";
        return true;
    }
    if (sinMovimientosB) {
        gameActive = false;
        statusEl.textContent = isCheck('B', board) ? "¡JAQUE MATE! ¡Ganaste!" : "TABLAS - AHOGADO";
        return true;
    }
    return false;
}
function checkPromotion(r, c, color) {
    const isW = color === 'W';
    if (!isPromotionPending(r, c, color)) {
        // Sin promoción: cambiar turno normalmente
        turn = isW ? 'B' : 'W';
        currentPlayer = turn;
        firstMoveCompleted = true;
        updateUI();
        if (turn === 'B' && gameActive) setTimeout(() => aiBrain(), 150);
        return;
    }

    if (!isW) {
        board[r][c] = 'q'; // La IA siempre elige reina
        turn = 'W';
        currentPlayer = 'W';
        firstMoveCompleted = true;
        updateUI();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'promotion-modal';
    const choices = ['Q', 'R', 'B', 'N'];

    choices.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'promo-option';
        btn.innerHTML = PIECES_CHAR[p];
        btn.onclick = () => {
            board[r][c] = p;
            modal.remove();
            turn = 'B';
            currentPlayer = 'B';
            firstMoveCompleted = true;
            updateUI();
            statusEl.textContent = "IA PENSANDO...";
            setTimeout(aiBrain, 500);
        };
        modal.appendChild(btn);
    });
    document.body.appendChild(modal);
}

function verificarJaqueMate() {
    const movimientos = getLegalMoves(currentPlayer, board);
    const enJaque = isCheck(currentPlayer, board);

    if (enJaque && movimientos.length === 0) {
        gameActive = false;
        const ganador = currentPlayer === 'W' ? "¡NEGRAS GANAN!" : "¡BLANCAS GANAN!";
        statusEl.textContent = ganador;
        playSound('win');
        return true;
    }
    return false;
}

function isPromotionPending(r, c, color) {
    return (color === 'W' && r === 0) || (color === 'B' && r === 7);
}

// sonidos del juego
function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
        else if (type === 'win') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
        else if (type === 'enroque') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(330, ctx.currentTime);
            osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        }
        else if (type === 'capture') {
            // ⚡ AGREGA: Sonido más agudo para captura
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // Más agudo
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        }
    } catch (e) {
        console.log('Audio no disponible');
    }
}

function endGame() {
    gameActive = false;
    const playerWins = isCheck('B', board);
    if (playerWins) {
        statusEl.textContent = "¡VICTORIA MAGISTRAL!";
        playSound('win');
    } else {
        statusEl.textContent = "DERROTA...";
    }
}
