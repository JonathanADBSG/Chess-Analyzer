// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7FmlvMtpY1_nDyKUsvJVvvh79HTDWl3RcKZHDvFw2AnLnzsz8d3YXbtJEdT0JgT32/exec";

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
const openingAdvPctWhite = document.getElementById('opening-advantage-pct-white');
const endgameAdvPctWhite = document.getElementById('endgame-advantage-pct-white');
const openingAdvPctBlack = document.getElementById('opening-advantage-pct-black');
const endgameAdvPctBlack = document.getElementById('endgame-advantage-pct-black');
const lossPhaseChartCanvas = document.getElementById('loss-phase-chart');
const topOpeningsWhiteBestUl = document.getElementById('top-openings-white-best');
const topOpeningsWhiteWorstUl = document.getElementById('top-openings-white-worst');
const topOpeningsBlackBestUl = document.getElementById('top-openings-black-best');
const topOpeningsBlackWorstUl = document.getElementById('top-openings-black-worst');
const openingStatsTbody = document.querySelector('#opening-stats-table tbody');


// --- STATE & CHART VARIABLES ---
let allGames = [];
let currentDateFilter = 0; // 0 for All Time
let currentGameTypeFilter = 'All'; // 'All', 'Online', or 'OTB'
let overallChart, whiteChart, blackChart, lossPhaseChart;

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
 * Calculates and displays top openings by win rate for each color
 */
function updateOpeningReport(games) {
    const whiteOpenings = {};
    const blackOpenings = {};
    const minGamesForRanking = 2;

    games.forEach(game => {
        const opening = game.Opening;
        if (!opening) return;
        
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

    const allOpenings = [...Object.values(whiteOpenings), ...Object.values(blackOpenings)];
    openingStatsTbody.innerHTML = '';
    allOpenings.forEach(op => {
        const winRate = op.total > 0 ? ((op.wins / op.total) * 100).toFixed(0) : 0;
        const row = `<tr><td>${op.name}</td><td>${op.color}</td><td>${op.wins}</td><td>${op.losses}</td><td>${op.draws}</td><td>${winRate}%</td></tr>`;
        openingStatsTbody.innerHTML += row;
    });

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
 * Calculates and displays the Game Phase Analyzer statistics by color
 */
function updatePhaseAnalyzer(games) {
    let whiteOpeningTotal = 0, whiteOpeningAdv = 0;
    let whiteEndgameTotal = 0, whiteEndgameAdv = 0;
    let blackOpeningTotal = 0, blackOpeningAdv = 0;
    let blackEndgameTotal = 0, blackEndgameAdv = 0;

    games.forEach(game => {
        const openingEval = parseFloat(game['Evaluation after opening']);
        const endgameEval = parseFloat(game['Evaluation beginning end game']);

        if (game.MyColor === 'White') {
            if (!isNaN(openingEval)) {
                whiteOpeningTotal++;
                if (openingEval > 0) whiteOpeningAdv++;
            }
            if (!isNaN(endgameEval)) {
                whiteEndgameTotal++;
                if (endgameEval > 0) whiteEndgameAdv++;
            }
        } else if (game.MyColor === 'Black') {
            if (!isNaN(openingEval)) {
                blackOpeningTotal++;
                if (openingEval < 0) blackOpeningAdv++;
            }
            if (!isNaN(endgameEval)) {
                blackEndgameTotal++;
                if (endgameEval < 0) blackEndgameAdv++;
            }
        }
    });

    const whiteOpeningPct = whiteOpeningTotal > 0 ? ((whiteOpeningAdv / whiteOpeningTotal) * 100).toFixed(1) : 0;
    const whiteEndgamePct = whiteEndgameTotal > 0 ? ((whiteEndgameAdv / whiteEndgameTotal) * 100).toFixed(1) : 0;
    const blackOpeningPct = blackOpeningTotal > 0 ? ((blackOpeningAdv / blackOpeningTotal) * 100).toFixed(1) : 0;
    const blackEndgamePct = blackEndgameTotal > 0 ? ((blackEndgameAdv / blackEndgameTotal) * 100).toFixed(1) : 0;

    openingAdvPctWhite.textContent = `${whiteOpeningPct}%`;
    endgameAdvPctWhite.textContent = `${whiteEndgamePct}%`;
    openingAdvPctBlack.textContent = `${blackOpeningPct}%`;
    endgameAdvPctBlack.textContent = `${blackEndgamePct}%`;
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
