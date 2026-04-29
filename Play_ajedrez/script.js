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

// --- 5. IA (aiBrain, evaluateBoard, minimax) ---
function aiBrain() {
    if (!gameActive) return;
    if (aiThinking) return; // Ya está pensando
    aiThinking = true;

    const moves = getLegalMoves('B', board);
    if (moves.length === 0) {
        gameActive = false;
        statusEl.textContent = isCheck('B', board) ? "¡JAQUE MATE! GANAS TÚ" : "TABLAS";
        if (isCheck('B', board)) playSound('win');
        aiThinking = false;
        return;
    }

    // ⚡ DETECCIÓN DE COMPLEJIDAD
    let hasComplexPosition = false;
    let whiteQueens = 0;
    let totalPieces = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) totalPieces++;
            if (piece === 'Q') whiteQueens++;
            if (piece === 'Q' && r < 2) hasComplexPosition = true;
        }
    }

    if (whiteQueens > 1) hasComplexPosition = true;
    if (moves.length > 40) hasComplexPosition = true;

    // Profundidad adaptativa — mínimo 3 para detectar amenazas de jaque mate
    let analysisDepth;
    if (!firstMoveCompleted) {
        analysisDepth = 2; // Primer movimiento: rápido pero funcional
    } else if (totalPieces <= 10) {
        analysisDepth = 4; // Final de partida: profundizar
    } else if (moves.length > 35) {
        analysisDepth = 3; // Muchos movimientos en apertura
    } else if (moves.length > 20) {
        analysisDepth = 3;
    } else {
        analysisDepth = 4; // Pocas piezas → más profundidad
    }

    console.log(`📊 IA: Profundidad=${analysisDepth} | Piezas=${totalPieces} | Reinas=${whiteQueens} | Movimientos=${moves.length}`);

    let bestMove = null;
    let bestValue = -Infinity;
    evaluationCount = 0; // Reinicia contador

    // Ordenar movimientos simple: priorizar capturas
    const sortedMoves = moves.sort((a, b) => {
        const aCaptures = board[a.tR][a.tC] !== '';
        const bCaptures = board[b.tR][b.tC] !== '';
        return (bCaptures === aCaptures) ? 0 : (bCaptures ? 1 : -1);
    });

    // Limitar número de movimientos a evaluar (más restrictivo en primera jugada)
    const maxMovesToEvaluate = !firstMoveCompleted ? Math.min(sortedMoves.length, 8) : Math.min(sortedMoves.length, hasComplexPosition ? 25 : 30);

    for (let i = 0; i < maxMovesToEvaluate; i++) {
        const m = sortedMoves[i];
        if (evaluationCount > MAX_EVALUATIONS) {
            console.log('⚠️ IA: Límite global alcanzado');
            break;
        }

        const tempBoard = makeSimulatedMove(board, m);
        // CORRECCIÓN: pasar (board, depth, alpha, beta, isMaximizing)
        const score = minimax(tempBoard, analysisDepth, -Infinity, Infinity, false);

        if (score > bestValue) {
            bestValue = score;
            bestMove = m;
        }
    }

    if (!bestMove) {
        bestMove = moves[0];
        console.log('⚠️ IA: Movimiento de emergencia');
    }

    console.log(`✅ IA: Ejecutando ${PIECES_CHAR[board[bestMove.fR][bestMove.fC]]} de ${String.fromCharCode(65 + bestMove.fC)}${8 - bestMove.fR} a ${String.fromCharCode(65 + bestMove.tC)}${8 - bestMove.tR}`);

    aiThinking = false; // ✅ RESET ANTES de executeMove
    executeMove(bestMove.fR, bestMove.fC, bestMove.tR, bestMove.tC, bestMove.special);
}

// REEMPLAZO: implementación funcional de minimax con poda alfa-beta
function minimax(nodeBoard, depth, alpha, beta, isMaximizing) {
    // Contador de evaluaciones
    if (evaluationCount > MAX_EVALUATIONS) {
        return evaluateBoard(nodeBoard);
    }

    if (depth <= 0) {
        evaluationCount++;
        return evaluateBoard(nodeBoard);
    }

    const side = isMaximizing ? 'B' : 'W';
    const moves = getLegalMoves(side, nodeBoard);

    if (moves.length === 0) {
        // No hay movimientos: evaluar posición (jaque mate o tablas)
        evaluationCount++;
        return evaluateBoard(nodeBoard);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of moves) {
            const newBoard = makeSimulatedMove(nodeBoard, move);
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
            if (evaluationCount > MAX_EVALUATIONS) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            const newBoard = makeSimulatedMove(nodeBoard, move);
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
            if (evaluationCount > MAX_EVALUATIONS) break;
        }
        return minEval;
    }
}

// --- 2. CONTROL DE ESTADO: ¿QUIÉN GANA? ---
function verificarFinPartida() {
    const sinMovimientosW = getLegalMoves('W', board).length === 0;
    const sinMovimientosB = getLegalMoves('B', board).length === 0;

    if (sinMovimientosW) {
        gameActive = false;
        statusEl.textContent = isCheck('W', board) ? "¡JAQUE MATE! La IA te ha ganado" : "TABLAS - AHOGADO";
        return true;
    }
    if (sinMovimientosB) {
        gameActive = false;
        statusEl.textContent = isCheck('B', board) ? "¡JAQUE MATE! ¡Ganaste!" : "TABLAS - AHOGADO";
        return true;
    }
    return false;
}

// --- 3. CORRECCIÓN DEL ESTADO "IA PENSANDO" ---
async function turnoIA() {
    // Delegamos directamente en aiBrain(), que ya implementa toda la lógica
    aiBrain();
}

// ⚡ EVALUACIÓN AVANZADA — material + posición + seguridad del rey + movilidad
function evaluateBoard(b) {
    let score = 0;

    // Tablas de posición por pieza (perspectiva negras = positivo)
    const PAWN_TABLE_B = [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ];
    const KNIGHT_TABLE_B = [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ];
    const BISHOP_TABLE_B = [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ];
    const KING_TABLE_MG_B = [  // Seguridad del rey en medio juego
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ];

    let totalPieces = 0;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (b[r][c]) totalPieces++;

    const isEndgame = totalPieces <= 12;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p) continue;

            const isBlack = p === p.toLowerCase();
            const type    = p.toLowerCase();
            const val     = VALUES[type] || 0;
            const sign    = isBlack ? 1 : -1;

            // Material base
            score += sign * val;

            // Bonus posicional según tipo
            let posBonus = 0;
            if (type === 'p') {
                posBonus = isBlack ? PAWN_TABLE_B[r][c] : PAWN_TABLE_B[7-r][c];
            } else if (type === 'n') {
                posBonus = isBlack ? KNIGHT_TABLE_B[r][c] : KNIGHT_TABLE_B[7-r][c];
            } else if (type === 'b') {
                posBonus = isBlack ? BISHOP_TABLE_B[r][c] : BISHOP_TABLE_B[7-r][c];
            } else if (type === 'k' && !isEndgame) {
                posBonus = isBlack ? KING_TABLE_MG_B[r][c] : KING_TABLE_MG_B[7-r][c];
            }

            score += sign * posBonus * 0.5;
        }
    }

    // Penalización por jaque al rey de cada bando
    if (isCheck('W', b)) score += 25;  // bueno para negras
    if (isCheck('B', b)) score -= 25;  // bueno para blancas

    // Bonus por movilidad (número de movimientos legales)
    const blackMoves = getLegalMoves('B', b).length;
    const whiteMoves = getLegalMoves('W', b).length;
    score += (blackMoves - whiteMoves) * 0.15;

    return score;
}

// --- 6. INTERFAZ DE USUARIO ---
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
