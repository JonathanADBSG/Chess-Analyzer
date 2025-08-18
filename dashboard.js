// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsCqJouDrh3a2ilf3d_XrCmVFZ6LP7Bib_No3uziBBkBlM_YBIzgonv1Bwydzo16Da/exec";

// --- DOM ELEMENTS ---
const loaderOverlay = document.getElementById('loader-overlay'); // Get the loader
const typeFilterContainer = document.getElementById('type-filter-container');
const dateFilterContainer = document.getElementById('filter-container');
const overallChartCanvas = document.getElementById('overall-stats-chart');
const whiteChartCanvas = document.getElementById('white-stats-chart');
const blackChartCanvas = document.getElementById('black-stats-chart');
const topReasonsWinWhiteUl = document.getElementById('top-reasons-win-white');
const topReasonsLossWhiteUl = document.getElementById('top-reasons-loss-white');
const topReasonsWinBlackUl = document.getElementById('top-reasons-win-black');
const topReasonsLossBlackUl = document.getElementById('top-reasons-loss-black');
const bestAdvantagesUl = document.getElementById('best-advantages');
const worstAdvantagesUl = document.getElementById('worst-advantages');
const lossPhaseChartCanvas = document.getElementById('loss-phase-chart');
const topOpeningsWhiteBestUl = document.getElementById('top-openings-white-best');
const topOpeningsWhiteWorstUl = document.getElementById('top-openings-white-worst');
const topOpeningsBlackBestUl = document.getElementById('top-openings-black-best');
const topOpeningsBlackWorstUl = document.getElementById('top-openings-black-worst');
const improvisedOpeningsWhiteUl = document.getElementById('improvised-openings-white-list');
const improvisedOpeningsBlackUl = document.getElementById('improvised-openings-black-list');
const openingStatsTbody = document.querySelector('#opening-stats-table tbody');
const openingAdvChartCanvas = document.getElementById('opening-advantage-chart');
const endgameAdvChartCanvas = document.getElementById('endgame-advantage-chart');


// --- STATE & CHART VARIABLES ---
let allGames = [];
let currentDateFilter = 0; // 0 for All Time
let currentGameTypeFilter = 'All'; // 'All', 'Online', or 'OTB'
let overallChart, whiteChart, blackChart, lossPhaseChart;
let openingAdvChart, endgameAdvChart;

/**
 * Main function to fetch all data and initialize the dashboard
 */
async function initializeDashboard() {
    loaderOverlay.style.display = 'flex'; // Show loader
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        if (data.error) throw new Error(`Error from Google Script: ${data.error}`);
        if (!data.logs) throw new Error("Data format from Google Script is incorrect.");

        allGames = data.logs;
        updateDashboard();
    } catch (error) {
        console.error("Error during dashboard initialization:", error);
        alert(`Could not load game data: ${error.message}`);
    } finally {
        loaderOverlay.style.display = 'none'; // Hide loader
    }
}
/**
 * Main function to update all dashboard components with filtered data
 */
function updateDashboard() {
    let filteredGames = filterDataByDate(currentDateFilter);
    filteredGames = filterDataByType(filteredGames, currentGameTypeFilter);

    updateOverallStats(filteredGames);
    updateStatsByColor(filteredGames);
    updateReasonReportForWhite(filteredGames);
    updateReasonReportForBlack(filteredGames);
    updateAdvantageReport(filteredGames);
    updatePhaseAnalyzer(filteredGames);
    updateLossPhaseReport(filteredGames);
    updateOpeningReport(filteredGames);
    updateImprovisedOpeningsReport(filteredGames);
    updateAdvantageOutcomeCharts(filteredGames);
}

/**
 * Filters the master list of games by the selected date range
 */
function filterDataByDate(days) {
    if (days === 0) return allGames;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return allGames.filter(game => new Date(game.Date) >= cutoffDate);
}

/**
 * Filters a list of games by the selected game type
 */
function filterDataByType(games, type) {
    if (type === 'All') {
        return games;
    }
    return games.filter(game => game.GameType === type);
}

/**
 * Generic helper function to render a simple list in a UL element
 */
function renderList(element, items) {
    element.innerHTML = '';
    if (items.length === 0) {
        element.innerHTML = '<li>Not enough data</li>';
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        element.appendChild(li);
    });
}

/**
 * MODIFIED: Calculates and displays top openings, grouped by color, with a new usage % column.
 */
function updateOpeningReport(games) {
    const whiteOpenings = {};
    const blackOpenings = {};
    const minGamesForRanking = 2;

    // Calculate total games for each color to determine usage percentage
    const totalWhiteGames = games.filter(g => g.MyColor === 'White').length;
    const totalBlackGames = games.filter(g => g.MyColor === 'Black').length;

    games.forEach(game => {
        let opening = game.Opening;
        if (!opening) return;

        // --- CUSTOM GROUPING LOGIC ---
        if (game.MyColor === 'White' && opening.startsWith("Queen's Pawn Game: Chigorin Variation")) {
            opening = "Rapport-Jobava System";
        }
        // --- END CUSTOM GROUPING ---

        let stats;
        if (game.MyColor === 'White') {
            if (!whiteOpenings[opening]) whiteOpenings[opening] = { name: opening, color: 'White', wins: 0, losses: 0, draws: 0, total: 0 };
            stats = whiteOpenings[opening];
        } else if (game.MyColor === 'Black') {
            if (!blackOpenings[opening]) blackOpenings[opening] = { name: opening, color: 'Black', wins: 0, losses: 0, draws: 0, total: 0 };
            stats = blackOpenings[opening];
        } else {
            return;
        }

        stats.total++;
        if (game.Result === '1/2-1/2') stats.draws++;
        else if ((game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1')) stats.wins++;
        else stats.losses++;
    });

    openingStatsTbody.innerHTML = ''; // Clear the table body

    // Helper function to generate table rows for a given set of openings
    const generateTableRows = (openingsObject, totalGamesForColor) => {
        const openingsArray = Object.values(openingsObject);
        let rowsHtml = '';
        openingsArray
            .sort((a, b) => b.total - a.total) // Sort by most played
            .forEach(op => {
                const winRate = op.total > 0 ? ((op.wins / op.total) * 100).toFixed(0) : 0;
                const usagePct = totalGamesForColor > 0 ? ((op.total / totalGamesForColor) * 100).toFixed(0) : 0;
                rowsHtml += `<tr><td>${op.name}</td><td>${op.color}</td><td>${op.wins}</td><td>${op.losses}</td><td>${op.draws}</td><td>${winRate}%</td><td>${usagePct}%</td></tr>`;
            });
        return rowsHtml;
    };

    // Generate and append rows for White, then for Black
    openingStatsTbody.innerHTML += generateTableRows(whiteOpenings, totalWhiteGames);
    openingStatsTbody.innerHTML += generateTableRows(blackOpenings, totalBlackGames);

    // This part for the Top 3 Best/Worst lists remains the same
    const rankOpenings = (openingsObject) => {
        const ranked = Object.values(openingsObject)
            .filter(stats => stats.total >= minGamesForRanking)
            .map(stats => ({ ...stats, score: (stats.wins + stats.draws * 0.5) / stats.total }))
            .sort((a, b) => b.score - a.score);

        const best = ranked.slice(0, 3).map(op => `${op.name} (${(op.score * 100).toFixed(0)}% score over ${op.total} games)`);
        const worst = ranked.slice(-3).reverse().map(op => `${op.name} (${(op.score * 100).toFixed(0)}% score over ${op.total} games)`);

        return { best, worst };
    };

    const whiteRanks = rankOpenings(whiteOpenings);
    const blackRanks = rankOpenings(blackOpenings);

    renderList(topOpeningsWhiteBestUl, whiteRanks.best);
    renderList(topOpeningsWhiteWorstUl, whiteRanks.worst);
    renderList(topOpeningsBlackBestUl, blackRanks.best);
    renderList(topOpeningsBlackWorstUl, blackRanks.worst);
}

/**
 * MODIFIED: Calculates top 3 improvised openings separately for White and Black.
 */
function updateImprovisedOpeningsReport(games) {
    const whiteOpeningStats = {};
    const blackOpeningStats = {};
    const minGamesForRanking = 2; // Minimum number of games to be considered

    games.forEach(game => {
        let opening = game.Opening;
        const inBookStatus = game['In book during opening'];

        if (!opening || !inBookStatus) return; // Skip if data is missing

        let targetStats;

        if (game.MyColor === 'White') {
            // Apply custom grouping for White
            if (opening.startsWith("Queen's Pawn Game: Chigorin Variation")) {
                opening = "Rapport-Jobava System";
            }
            targetStats = whiteOpeningStats;
        } else if (game.MyColor === 'Black') {
            targetStats = blackOpeningStats;
        } else {
            return; // Skip if color isn't White or Black
        }

        // Initialize if first time seeing this opening
        if (!targetStats[opening]) {
            targetStats[opening] = {
                name: opening,
                total: 0,
                improvisedCount: 0
            };
        }

        // Increment counts
        targetStats[opening].total++;
        if (inBookStatus === 'No' || inBookStatus === 'Improvised') {
            targetStats[opening].improvisedCount++;
        }
    });

    // Helper function to process and rank the openings for a given color
    const rankAndFormat = (statsObject) => {
        return Object.values(statsObject)
            .filter(stats => stats.total >= minGamesForRanking)
            .map(stats => ({
                ...stats,
                improvisedPct: (stats.improvisedCount / stats.total) * 100
            }))
            .sort((a, b) => b.improvisedPct - a.improvisedPct)
            .slice(0, 3)
            .map(stats => `${stats.name} (${stats.improvisedPct.toFixed(0)}% improvised over ${stats.total} games)`);
    };

    // Process for each color and render to the UI
    const rankedWhiteOpenings = rankAndFormat(whiteOpeningStats);
    const rankedBlackOpenings = rankAndFormat(blackOpeningStats);

    renderList(improvisedOpeningsWhiteUl, rankedWhiteOpenings);
    renderList(improvisedOpeningsBlackUl, rankedBlackOpenings);
}


/**
 * Calculates and displays the distribution of losses by game phase
 */
function updateLossPhaseReport(games) {
    const phaseCounts = { 'Opening': 0, 'Middlegame': 0, 'Endgame': 0 };

    const lostGames = games.filter(game => {
        const isWin = (game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1');
        const isDraw = game.Result === '1/2-1/2';
        return !isWin && !isDraw;
    });

    lostGames.forEach(game => {
        const phase = game['Phase of the game where lost'];
        if (phaseCounts.hasOwnProperty(phase)) {
            phaseCounts[phase]++;
        }
    });

    const labels = Object.keys(phaseCounts);
    const data = Object.values(phaseCounts);
    const colors = ['#ffc107', '#fd7e14', '#dc3545'];

    renderPieChart(lossPhaseChartCanvas, 'lossPhaseChart', { labels, data, colors }, {
        responsive: true,
        plugins: { legend: { position: 'top' } }
    });
}

/**
 * ROBUST VERSION: Calculates and displays the detailed Game Phase Analyzer statistics by color
 */
function updatePhaseAnalyzer(games) {
    // Initialize counters
    const counts = {
        white: {
            opening: { total: 0, better: 0, slightlyBetter: 0, equal: 0, slightlyWorse: 0, worse: 0 },
            endgame: { total: 0, better: 0, slightlyBetter: 0, equal: 0, slightlyWorse: 0, worse: 0 }
        },
        black: {
            opening: { total: 0, better: 0, slightlyBetter: 0, equal: 0, slightlyWorse: 0, worse: 0 },
            endgame: { total: 0, better: 0, slightlyBetter: 0, equal: 0, slightlyWorse: 0, worse: 0 }
        }
    };

    // Helper to categorize and count an evaluation
    const processEval = (evaluation, stats) => {
        if (isNaN(evaluation)) return;
        stats.total++;

        // Multiply by 10 to convert floats to integers for a reliable switch comparison
        const evalInt = Math.round(evaluation * 10);

        switch (evalInt) {
            case 10: stats.better++; break;
            case 5: stats.slightlyBetter++; break;
            case 0: stats.equal++; break;
            case -5: stats.slightlyWorse++; break;
            case -10: stats.worse++; break;
        }
    };

    games.forEach(game => {
        const openingEval = parseFloat(game['Evaluation after opening']);
        const endgameEval = parseFloat(game['Evaluation beginning end game']);

        if (game.MyColor === 'White') {
            processEval(openingEval, counts.white.opening);
            processEval(endgameEval, counts.white.endgame);
        } else if (game.MyColor === 'Black') {
            processEval(openingEval, counts.black.opening);
            processEval(endgameEval, counts.black.endgame);
        }
    });

    // Helper to calculate percentage and update the DOM
    const updateUI = (color, phase, stats) => {
        const getPct = (count) => (stats.total > 0 ? (count / stats.total * 100).toFixed(1) : '0.0');

        document.getElementById(`${phase}-better-pct-${color}`).textContent = `${getPct(stats.better)}%`;
        document.getElementById(`${phase}-slightly-better-pct-${color}`).textContent = `${getPct(stats.slightlyBetter)}%`;
        document.getElementById(`${phase}-equal-pct-${color}`).textContent = `${getPct(stats.equal)}%`;
        document.getElementById(`${phase}-slightly-worse-pct-${color}`).textContent = `${getPct(stats.slightlyWorse)}%`;
        document.getElementById(`${phase}-worse-pct-${color}`).textContent = `${getPct(stats.worse)}%`;
    };

    // Update UI for all 4 sections
    updateUI('white', 'opening', counts.white.opening);
    updateUI('white', 'endgame', counts.white.endgame);
    updateUI('black', 'opening', counts.black.opening);
    updateUI('black', 'endgame', counts.black.endgame);
}


/**
 * Calculates and renders the overall Win/Loss/Draw pie chart
 */
function updateOverallStats(games) {
    const stats = { wins: 0, losses: 0, draws: 0 };
    games.forEach(game => {
        if (game.Result === '1/2-1/2') {
            stats.draws++;
        } else if ((game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1')) {
            stats.wins++;
        } else {
            stats.losses++;
        }
    });

    renderPieChart(overallChartCanvas, 'overallChart', {
        labels: ['Wins', 'Losses', 'Draws'],
        data: [stats.wins, stats.losses, stats.draws],
        colors: ['#28a745', '#dc3545', '#6c757d']
    }, { responsive: true, plugins: { legend: { position: 'top' } } });
}

/**
 * Calculates and renders the W/L/D charts for each color
 */
function updateStatsByColor(games) {
    const whiteStats = { wins: 0, losses: 0, draws: 0 };
    const blackStats = { wins: 0, losses: 0, draws: 0 };

    games.forEach(game => {
        const isWin = (game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1');
        const isDraw = game.Result === '1/2-1/2';

        if (game.MyColor === 'White') {
            if (isWin) whiteStats.wins++;
            else if (isDraw) whiteStats.draws++;
            else whiteStats.losses++;
        } else if (game.MyColor === 'Black') {
            if (isWin) blackStats.wins++;
            else if (isDraw) blackStats.draws++;
            else blackStats.losses++;
        }
    });

    const sharedData = { labels: ['Wins', 'Losses', 'Draws'], colors: ['#28a745', '#dc3545', '#6c757d'] };
    renderPieChart(whiteChartCanvas, 'whiteChart', { ...sharedData, data: [whiteStats.wins, whiteStats.losses, whiteStats.draws] }, { responsive: true });
    renderPieChart(blackChartCanvas, 'blackChart', { ...sharedData, data: [blackStats.wins, blackStats.losses, blackStats.draws] }, { responsive: true });
}

/**
 * Calculates and displays top reasons for wins and losses as White
 */
function updateReasonReportForWhite(games) {
    const winReasons = {};
    const lossReasons = {};
    const whiteGames = games.filter(game => game.MyColor === 'White');

    whiteGames.forEach(game => {
        const reason = game['Reason for win/loss'];
        if (!reason) return;

        if (game.Result === '1-0') winReasons[reason] = (winReasons[reason] || 0) + 1;
        else if (game.Result === '0-1') lossReasons[reason] = (lossReasons[reason] || 0) + 1;
    });

    const topWinReasons = Object.entries(winReasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([reason, count]) => `${reason} (${count})`);
    const topLossReasons = Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([reason, count]) => `${reason} (${count})`);

    renderList(topReasonsWinWhiteUl, topWinReasons);
    renderList(topReasonsLossWhiteUl, topLossReasons);
}

/**
 * Calculates and displays top reasons for wins and losses as Black
 */
function updateReasonReportForBlack(games) {
    const winReasons = {};
    const lossReasons = {};
    const blackGames = games.filter(game => game.MyColor === 'Black');

    blackGames.forEach(game => {
        const reason = game['Reason for win/loss'];
        if (!reason) return;

        if (game.Result === '0-1') winReasons[reason] = (winReasons[reason] || 0) + 1;
        else if (game.Result === '1-0') lossReasons[reason] = (lossReasons[reason] || 0) + 1;
    });

    const topWinReasons = Object.entries(winReasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([reason, count]) => `${reason} (${count})`);
    const topLossReasons = Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([reason, count]) => `${reason} (${count})`);

    renderList(topReasonsWinBlackUl, topWinReasons);
    renderList(topReasonsLossBlackUl, topLossReasons);
}

/**
 * Calculates and displays best/worst advantages to convert
 */
function updateAdvantageReport(games) {
    const advantages = {};
    const minGamesForRanking = 2;

    games.forEach(game => {
        const advantageTypes = [game['Advantage Middle Game'], game['Advantage End Game']].filter(Boolean);
        const isWin = (game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1');

        advantageTypes.forEach(adv => {
            if (!advantages[adv]) advantages[adv] = { total: 0, wins: 0 };
            advantages[adv].total++;
            if (isWin) advantages[adv].wins++;
        });
    });

    const rankedAdvantages = Object.entries(advantages)
        .filter(([adv, stats]) => stats.total >= minGamesForRanking)
        .map(([adv, stats]) => ({ name: adv, winRate: stats.wins / stats.total }));

    rankedAdvantages.sort((a, b) => b.winRate - a.winRate);

    const best = rankedAdvantages.slice(0, 3).map(a => `${a.name} (${(a.winRate * 100).toFixed(0)}% win rate)`);
    const worst = rankedAdvantages.slice(-3).reverse().map(a => `${a.name} (${(a.winRate * 100).toFixed(0)}% win rate)`);

    renderList(bestAdvantagesUl, best);
    renderList(worstAdvantagesUl, worst);
}

/**
 * CORRECTED: This function calculates W/L/D for games where you had an advantage.
 * It now correctly handles the new evaluation system for both colors.
 */
function updateAdvantageOutcomeCharts(games) {
    // --- Opening Advantage ---
    const openingGamesWithAdvantage = games.filter(game => {
        const evalOpening = parseFloat(game['Evaluation after opening']);
        // An advantage is a positive evaluation (0.5 for Slightly Better, 1.0 for Better).
        // This logic is now color-agnostic because the form captures the player's perspective.
        return !isNaN(evalOpening) && evalOpening > 0;
    });

    const openingStats = { wins: 0, losses: 0, draws: 0 };
    openingGamesWithAdvantage.forEach(game => {
        if (game.Result === '1/2-1/2') openingStats.draws++;
        else if ((game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1')) {
            openingStats.wins++;
        } else {
            openingStats.losses++;
        }
    });

    renderPieChart(openingAdvChartCanvas, 'openingAdvChart', {
        labels: ['Wins', 'Losses', 'Draws'],
        data: [openingStats.wins, openingStats.losses, openingStats.draws],
        colors: ['#28a745', '#dc3545', '#6c757d']
    }, { responsive: true, plugins: { legend: { position: 'top' } } });

    // --- Endgame Advantage ---
    const endgameGamesWithAdvantage = games.filter(game => {
        const evalEnd = parseFloat(game['Evaluation beginning end game']);
        // The logic is the same for the endgame evaluation.
        return !isNaN(evalEnd) && evalEnd > 0;
    });

    const endgameStats = { wins: 0, losses: 0, draws: 0 };
    endgameGamesWithAdvantage.forEach(game => {
        if (game.Result === '1/2-1/2') endgameStats.draws++;
        else if ((game.MyColor === 'White' && game.Result === '1-0') || (game.MyColor === 'Black' && game.Result === '0-1')) {
            endgameStats.wins++;
        } else {
            endgameStats.losses++;
        }
    });

    renderPieChart(endgameAdvChartCanvas, 'endgameAdvChart', {
        labels: ['Wins', 'Losses', 'Draws'],
        data: [endgameStats.wins, endgameStats.losses, endgameStats.draws],
        colors: ['#28a745', '#dc3545', '#6c757d']
    }, { responsive: true, plugins: { legend: { position: 'top' } } });
}


/**
 * Generic helper function to render a pie chart with custom data
 */
function renderPieChart(canvas, chartVar, chartData, options) {
    if (window[chartVar]) window[chartVar].destroy();

    window[chartVar] = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: chartData.colors
            }]
        },
        options: options
    });
}

// --- EVENT LISTENERS ---
dateFilterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        dateFilterContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentDateFilter = Number(e.target.dataset.days);
        updateDashboard();
    }
});

typeFilterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        typeFilterContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentGameTypeFilter = e.target.dataset.type;
        updateDashboard();
    }
});

// --- INITIALIZATION ---
initializeDashboard();
