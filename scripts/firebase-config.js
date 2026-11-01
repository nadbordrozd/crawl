// Firebase Configuration
// TODO: Replace this with your actual Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyALRT3oJ4Nj_xO2neeQi8mW4a73f5Raa5w",
    authDomain: "vibe-crawler.firebaseapp.com",
    projectId: "vibe-crawler",
    storageBucket: "vibe-crawler.firebasestorage.app",
    messagingSenderId: "211284148853",
    appId: "1:211284148853:web:ad2b3a7c6f54688a7cae3c",
    measurementId: "G-NW3J93YWDS"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Escape a value for insertion into innerHTML. Leaderboard entries come from
// Firestore and are written by players, so every field must go through this.
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// Format a Firestore number field for display (coerced, so a non-number shows as NaN)
function formatNumber(value) {
    return escapeHtml(Number(value).toLocaleString());
}

// Leaderboard functionality
const Leaderboard = {
    // Calculate score based on game statistics
    calculateScore: function(player, levelNumber, gameWon = false) {
        const stats = {
            level: levelNumber,
            turns: player.getTurns(),
            steps: player.getSteps(),
            coinsCollected: player.getCoinsCollected(),
            enemiesDefeated: player.getEnemiesDefeated()
        };
        
        // Calculate total enemies defeated
        let totalEnemies = 0;
        for (let enemyType in stats.enemiesDefeated) {
            totalEnemies += stats.enemiesDefeated[enemyType];
        }
        
        // Score calculation formula:
        // Base points for reaching level * 1000
        // + Enemies defeated * 100
        // + Coins collected * 50
        // - Turns taken (efficiency bonus)
        // + Bonus for higher levels (exponential)
        
        let score = 0;
        score += stats.level * 1000; // Base level completion bonus
        score += totalEnemies * 10; // Enemy defeat bonus
        score += stats.coinsCollected * 50; // Coin collection bonus
        score -= Math.floor(stats.turns / 10); // Small penalty for taking many turns
        
        // WIN BONUS: Huge bonus for actually completing the game!
        if (gameWon) {
            score += 5000; // Base completion bonus
        }
        
        // Ensure score is never negative
        return Math.max(score, 0);
    },
    
    // Submit score to Firebase; returns the new document id, or null on failure
    submitScore: async function(playerName, score, stats) {
        try {
            // A run that used the debug cheat never reaches the leaderboard
            if (typeof Game !== 'undefined' && Game.cheatUsed) {
                throw new Error('Debug run: not submitted');
            }

            // Basic client-side validation (can be bypassed, but adds a hurdle)
            if (!this.isValidSubmission(playerName, score, stats)) {
                throw new Error('Invalid score data');
            }
            
            const docRef = await db.collection('leaderboard').add({
                name: playerName,
                score: score,
                level: stats.level,
                turns: stats.turns,
                steps: stats.steps,
                coinsCollected: stats.coinsCollected,
                totalEnemiesDefeated: stats.totalEnemiesDefeated,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Score submitted with ID: ", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error adding score: ", error);
            return null;
        }
    },
    
    // Basic validation - this can be bypassed by determined users, but adds a hurdle
    isValidSubmission: function(playerName, score, stats) {
        // Name validation
        if (!playerName || typeof playerName !== 'string' || playerName.length === 0 || playerName.length > 20) {
            return false;
        }
        
        // Score validation - reasonable limits (allow higher scores for game winners)
        if (!score || typeof score !== 'number' || score < 0 || score > 5000000) {
            return false;
        }
        
        // Stats validation
        if (!stats || typeof stats !== 'object') {
            return false;
        }
        
        // Level validation
        if (!stats.level || stats.level < 1 || stats.level > 50) {
            return false;
        }
        
        // Turns validation
        if (!stats.turns || stats.turns < 1 || stats.turns > 100000) {
            return false;
        }
        
        // Steps validation
        if (stats.steps < 0 || stats.steps > 200000) {
            return false;
        }
        
        // Coins validation
        if (stats.coinsCollected < 0 || stats.coinsCollected > 10000) {
            return false;
        }
        
        // Enemies validation
        if (stats.totalEnemiesDefeated < 0 || stats.totalEnemiesDefeated > 5000) {
            return false;
        }
        
        return true;
    },
    
    // Get top scores from Firebase
    getTopScores: async function(limit = 100) {
        try {
            const snapshot = await db.collection('leaderboard')
                .orderBy('score', 'desc')
                .limit(limit)
                .get();
            
            const scores = [];
            snapshot.forEach((doc) => {
                scores.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return scores;
        } catch (error) {
            console.error("Error getting scores: ", error);
            return [];
        }
    },
    
    // Show leaderboard overlay
    showLeaderboard: async function() {
        const overlay = document.getElementById('leaderboard-overlay');
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div style="color: white; font-size: 20px;">Loading leaderboard...</div>';
        
        const scores = await this.getTopScores();
        this.renderLeaderboard(scores);
    },
    
    // Render leaderboard HTML
    renderLeaderboard: function(scores) {
        const overlay = document.getElementById('leaderboard-overlay');
        
        let html = '<div class="leaderboard-content">';
        html += '<div class="leaderboard-header">';
        html += '<h2 style="color: #ffff44; margin-bottom: 20px;">🏆 TOP 100 SCORES 🏆</h2>';
        html += '<button id="close-leaderboard" style="position: absolute; top: 10px; right: 15px; background: #ff4444; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">✕</button>';
        html += '</div>';
        
        if (scores.length === 0) {
            html += '<div style="color: white; text-align: center; margin: 50px;">No scores yet! Be the first to play!</div>';
        } else {
            html += '<div class="leaderboard-list">';
            html += '<div class="leaderboard-header-row">';
            html += '<div class="rank-col">Rank</div>';
            html += '<div class="name-col">Name</div>';
            html += '<div class="score-col">Score</div>';
            html += '<div class="level-col">Level</div>';
            html += '<div class="stats-col">Stats</div>';
            html += '</div>';
            
            scores.forEach((scoreEntry, index) => {
                const rank = index + 1;
                let rankDisplay = rank;
                if (rank === 1) rankDisplay = '🥇';
                else if (rank === 2) rankDisplay = '🥈';
                else if (rank === 3) rankDisplay = '🥉';
                
                html += '<div class="leaderboard-row">';
                html += '<div class="rank-col">' + rankDisplay + '</div>';
                html += '<div class="name-col">' + escapeHtml(scoreEntry.name || 'Anonymous') + '</div>';
                html += '<div class="score-col">' + formatNumber(scoreEntry.score) + '</div>';
                html += '<div class="level-col">' + escapeHtml(scoreEntry.level) + '</div>';
                html += '<div class="stats-col">' + escapeHtml(scoreEntry.totalEnemiesDefeated) + ' enemies, ' + escapeHtml(scoreEntry.coinsCollected) + ' coins</div>';
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        html += '<div style="margin-top: 20px; text-align: center;">';
        html += '<button id="play-again-from-leaderboard" style="background: #44ff44; color: black; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px; font-weight: bold; margin-right: 10px;">Play Game</button>';
        html += '</div>';
        html += '</div>';
        
        overlay.innerHTML = html;
        
        // Add event listeners
        document.getElementById('close-leaderboard').addEventListener('click', function() {
            overlay.style.display = 'none';
        });
        
        document.getElementById('play-again-from-leaderboard').addEventListener('click', function() {
            overlay.style.display = 'none';
            location.reload();
        });
    }
}; 