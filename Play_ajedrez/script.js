// --- MOTOR DE AJEDREZ PROFESIONAL
// Lógica de juego, IA, Enroque y Temporizadores.

// --- 1. REFERENCIAS AL DOM ---
const boardEl = document.getElementById('chess-board');
const statusEl = document.getElementById('status-box');
const historyEl = document.getElementById('move-history');
const timerWEl = document.getElementById('timer-w');
const timerBEl = document.getElementById('timer-b');

// --- 2. INICIALIZACIÓN ---
window.onload = () => {
    gameStarted = true; // ✅ CRÍTICO: Iniciar el juego
    updateUI();
    startTimers(); // Inicia la cuenta atrás
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

    // ⚡ AGREGA: Validación de seguridad
    if (!piece) {
        console.error('❌ Movimiento inválido: No hay pieza en', fR, fC);
        return;
    }

    const distance = Math.max(Math.abs(tR - fR), Math.abs(tC - fC));
    
    // ⚡ Valida que el movimiento sea razonable según la pieza
    if (piece.toLowerCase() === 'p' && distance > 2) {
        console.error('❌ Peón intenta movimiento imposible:', distance);
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

    const isCaptureMove = board[tR][tC] !== ''; // ⚡ AGREGA: Detecta captura

    // Actualizar estados de movimiento
    if (piece === 'K') movedState.W_K = true;
    if (piece === 'k') movedState.B_K = true;
    if (piece === 'R' && fC === 7) movedState.W_R8 = true;
    if (piece === 'R' && fC === 0) movedState.W_R1 = true;
    if (piece === 'r' && fC === 7) movedState.B_R8 = true;
    if (piece === 'r' && fC === 0) movedState.B_R1 = true;

    board[tR][tC] = piece;
    board[fR][fC] = '';

    // ⚡ AGREGA: Sonido según el movimiento
    if (!special) { // Solo si NO es enroque
        if (isCaptureMove) {
            playSound('capture'); // Sonido de captura
        } else {
            playSound('move'); // Sonido de movimiento normal
        }
    }

    // Registrar movimiento en historial
    const moveNotation = String.fromCharCode(65 + fC) + (8 - fR) + String.fromCharCode(65 + tC) + (8 - tR);
    const entry = document.createElement('div');
    entry.className = 'move-history';
    entry.textContent = moveNotation;
    historyEl.appendChild(entry);

    // IMPORTANTE: Comprobar promoción antes de cambiar turno
    if (piece.toLowerCase() === 'p') {
        checkPromotion(tR, tC, piece === piece.toUpperCase() ? 'W' : 'B');
    }

    turn = (turn === 'W') ? 'B' : 'W';
    updateUI();
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

            // ✅ PRIMERO: Renderizar la pieza (si existe)
            if (piece) {
                sq.textContent = PIECES_CHAR[piece];
                sq.classList.add(piece === piece.toUpperCase() ? 'p-white' : 'p-black');
            }

            // ✅ SEGUNDO: Agregar el evento onclick (DENTRO del bucle)
            sq.onclick = () => {
                if (!gameActive || turn !== 'W') return;

                // Bloquear clics si el menú de promoción está visible
                if (document.querySelector('.promotion-modal')) return;

                if (selected) {
                    const moves = getLegalMoves('W', board);
                    const move = moves.find(m => m.fR === selected.r && m.fC === selected.c && m.tR === r && m.tC === c);

                    if (move) {
                        executeMove(move.fR, move.fC, move.tR, move.tC, move.special);
                        selected = null;
                        updateUI();

                        // Solo llamar a la IA si NO hay una promoción pendiente
                        if (!isPromotionPending(move.tR, move.tC, 'W')) {
                            statusEl.textContent = "IA PENSANDO...";
                            setTimeout(aiBrain, 500);
                        }
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
            // Jaque Mate
            statusEl.textContent = turn === 'W' ? "¡JAQUE MATE! DERROTA" : "¡JAQUE MATE! ¡GANASTE!";
            playSound('win');
        } else {
            // Tablas por falta de movimientos (ahogado)
            statusEl.textContent = "TABLAS - AHOGADO";
        }
    } else {
        statusEl.textContent = turn === 'W' ? "TU TURNO" : "IA PENSANDO...";
    }
}

// --- 5. IA (aiBrain, evaluateBoard, minimax) ---
function aiBrain() {
    if (!gameActive) return;

    const moves = getLegalMoves('B', board);
    if (moves.length === 0) {
        gameActive = false;
        statusEl.textContent = isCheck('B', board) ? "¡JAQUE MATE! GANAS TÚ" : "TABLAS";
        if (isCheck('B', board)) playSound('win');
        return;
    }

    let bestMove = null;
    let bestValue = -99999;
    let evaluatedMoves = 0;

    // ⚡ AGREGA: Timeout de seguridad (máximo 3 segundos pensando)
    const timeoutId = setTimeout(() => {
        if (bestMove === null && moves.length > 0) {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
            console.log('⚠️ IA: Timeout alcanzado, movimiento aleatorio');
        }
    }, 3000);

    // MiniMax con pesos posicionales
    moves.forEach(m => {
        evaluatedMoves++;
        const tempBoard = makeSimulatedMove(board, m);
        
        // ⚡ AGREGA: Si ya evaluó demasiados, salta
        if (evaluatedMoves > 200) {
            console.log('⚠️ IA: Límite de evaluaciones alcanzado');
            return;
        }

        let score = minimax(2, tempBoard, -Infinity, Infinity, false);

        if (score > bestValue) {
            bestValue = score;
            bestMove = m;
        }
    });

    clearTimeout(timeoutId); // ⚡ AGREGA: Cancela el timeout si terminó

    // Si aún no hay movimiento, elige uno aleatorio
    if (!bestMove) {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
        console.log('⚠️ IA: Sin mejor movimiento, aleatorio');
    }

    executeMove(bestMove.fR, bestMove.fC, bestMove.tR, bestMove.tC, bestMove.special);
    updateUI();
}

function minimax(depth, b, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(b);

    const moves = getLegalMoves(isMaximizing ? 'B' : 'W', b);
    if (moves.length === 0) {
        // Jaque mate o tablas
        return isMaximizing ? -9999 : 9999;
    }
    // ⚡ AGREGA: Limita evaluaciones para evitar bucles
    if (depth < 0 || moves.length > 100) {
        return evaluateBoard(b);
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let m of moves) {
            const tempBoard = makeSimulatedMove(b, m);
            const score = minimax(depth - 1, tempBoard, alpha, beta, false);
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Poda Alfa-Beta
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let m of moves) {
            const tempBoard = makeSimulatedMove(b, m);
            const score = minimax(depth - 1, tempBoard, alpha, beta, true);
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return bestScore;
    }
}

function evaluateBoard(b) {
    let total = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p) {
                const val = VALUES[p.toLowerCase()] || 0;
                const isBlack = p === p.toLowerCase();
                // Suma posicional
                const posBonus = POS_WEIGHTS[r][c] * 0.5;
                total += isBlack ? (val + posBonus) : -(val + posBonus);
            }
        }
    }
    return total;
}

// --- 6. INTERFAZ DE USUARIO ---
function checkPromotion(r, c, color) {
    const isW = color === 'W';
    if (isPromotionPending(r, c, color)) {
        if (!isW) {
            board[r][c] = 'q'; // La IA siempre elige reina
            turn = "W"
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
                updateUI();
                statusEl.textContent = "IA PENSANDO...";
                setTimeout(aiBrain, 600);
            };
            modal.appendChild(btn);
        });
        document.body.appendChild(modal);
    }
}

function isPromotionPending(r, c, color) {
    return (color === 'W' && r === 0) || (color === 'B' && r === 7);
}

// --- 7. GESTIÓN DEL TIEMPO ---

function startTimers() {
    setInterval(() => {
        if (!gameActive || !gameStarted) return;
        if (turn === 'W') {
            timerW--;
            updateTimerDisplay('W', timerW);
        } else {
            timerB--;
            updateTimerDisplay('B', timerB);
        }
        if (timerW <= 0 || timerB <= 0) {
            gameActive = false;
            statusEl.textContent = "¡FIN DEL TIEMPO!";
        }
    }, 1000);
}

function updateTimerDisplay(player, time) {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const format = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (player === 'W') timerWEl.textContent = `Blancas: ${format}`;
    else timerBEl.textContent = `IA: ${format}`;
}

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