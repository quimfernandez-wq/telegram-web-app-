// Configuració global i estat
const POKEMON_LIMIT = 151; // Primera generació de Pokémon
let allPokemon = [];
let favoriteIds = JSON.parse(localStorage.getItem('pokedex_favorites')) || [];
let currentModalPokemon = null;

// Estat del Joc
let gameCurrentPokemon = null;
let gameScore = 0;
let gameStreak = 0;

// Traduccions dels tipus
const typeTranslations = {
    fire: 'Foc', water: 'Aigua', grass: 'Planta', electric: 'Elèctric',
    ice: 'Gel', fighting: 'Lluita', poison: 'Verí', ground: 'Terra',
    flying: 'Volador', psychic: 'Psíquic', bug: 'Cuc', rock: 'Roca',
    ghost: 'Fantasma', dragon: 'Drac', steel: 'Acer', fairy: 'Fada', normal: 'Normal'
};

// Elements DOM
const pokemonGrid = document.getElementById('pokemon-grid');
const favoritesGrid = document.getElementById('favorites-grid');
const noFavorites = document.getElementById('no-favorites');
const loadingSpinner = document.getElementById('loading-spinner');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const pokedexCount = document.getElementById('pokedex-count');
const favBadge = document.getElementById('fav-badge');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// Inicialització quan es carrega el DOM
document.addEventListener('DOMContentLoaded', async () => {
    updateFavBadge();
    await fetchAllPokemon();
    initTheme();
    initEventListeners();
    initGame();
});

// 1. CARREGAR DADES DES DE LA POKEAPI
async function fetchAllPokemon() {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${POKEMON_LIMIT}`);
        const data = await response.json();
        
        // Obtenir detalls de cada Pokémon en paral·lel
        const detailPromises = data.results.map(pokemon => fetch(pokemon.url).then(res => res.json()));
        allPokemon = await Promise.all(detailPromises);
        
        loadingSpinner.classList.add('d-none');
        renderPokemonGrid(allPokemon);
    } catch (error) {
        console.error('Error carregant els Pokémon:', error);
        loadingSpinner.innerHTML = `<div class="alert alert-danger">Error carregant les dades de PokeAPI. Torna-ho a intentar.</div>`;
    }
}

// 2. MOSTRAR TARGETES DE POKÉMON EN EL GRID
function renderPokemonGrid(pokemonList) {
    pokemonGrid.innerHTML = '';
    pokedexCount.textContent = `${pokemonList.length} Pokémon`;

    if (pokemonList.length === 0) {
        pokemonGrid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><p class="fs-5">No s'han trobat Pokémon amb aquests filtres.</p></div>`;
        return;
    }

    pokemonList.forEach(pokemon => {
        const isFav = favoriteIds.includes(pokemon.id);
        const cardHtml = createPokemonCardHTML(pokemon, isFav);
        pokemonGrid.appendChild(cardHtml);
    });
}

// Generador de Targeta HTML
function createPokemonCardHTML(pokemon, isFav) {
    const col = document.createElement('div');
    col.className = 'col';

    const mainType = pokemon.types[0].type.name;
    const imgUrl = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;

    const typesBadgeHtml = pokemon.types.map(t => {
        const nameCat = typeTranslations[t.type.name] || t.type.name;
        return `<span class="badge badge-type type-${t.type.name} me-1">${nameCat}</span>`;
    }).join('');

    col.innerHTML = `
        <div class="card h-100 shadow-sm pokemon-card border-0" onclick="openPokemonModal(${pokemon.id})">
            <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 px-3">
                <span class="text-muted fw-bold">${formattedId}</span>
                <button class="btn btn-link p-0 text-danger fav-btn" onclick="event.stopPropagation(); toggleFavorite(${pokemon.id})" title="Favorit">
                    <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} fs-5"></i>
                </button>
            </div>
            <div class="card-body text-center pt-0">
                <img src="${imgUrl}" alt="${pokemon.name}" class="img-fluid drop-shadow mb-3" style="height: 120px; object-fit: contain;">
                <h5 class="card-title text-capitalize fw-bold mb-2">${pokemon.name}</h5>
                <div>${typesBadgeHtml}</div>
            </div>
        </div>
    `;

    return col;
}

// 3. MODAL DE DETALLS
async function openPokemonModal(pokemonId) {
    const pokemon = allPokemon.find(p => p.id === pokemonId);
    if (!pokemon) return;

    currentModalPokemon = pokemon;
    const modal = new bootstrap.Modal(document.getElementById('pokemonModal'));

    // Omplir informació bàsica
    document.getElementById('modal-pokemon-id').textContent = `#${String(pokemon.id).padStart(3, '0')}`;
    document.getElementById('modal-pokemon-name').textContent = pokemon.name;
    document.getElementById('modal-pokemon-img').src = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    document.getElementById('modal-pokemon-height').textContent = `${(pokemon.height / 10).toFixed(1)} m`;
    document.getElementById('modal-pokemon-weight').textContent = `${(pokemon.weight / 10).toFixed(1)} kg`;

    // Tipus
    const typesContainer = document.getElementById('modal-pokemon-types');
    typesContainer.innerHTML = pokemon.types.map(t => {
        const nameCat = typeTranslations[t.type.name] || t.type.name;
        return `<span class="badge badge-type type-${t.type.name}">${nameCat}</span>`;
    }).join(' ');

    // Estadístiques
    const statsContainer = document.getElementById('modal-pokemon-stats');
    const statNames = { hp: 'PS', attack: 'Atac', defense: 'Defensa', 'special-attack': 'At. Esp.', 'special-defense': 'Def. Esp.', speed: 'Velocitat' };
    statsContainer.innerHTML = pokemon.stats.map(s => {
        const nameCat = statNames[s.stat.name] || s.stat.name;
        const percentage = Math.min((s.base_stat / 150) * 100, 100);
        return `
            <div class="mb-2">
                <div class="d-flex justify-content-between small fw-bold">
                    <span>${nameCat}</span>
                    <span>${s.base_stat}</span>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-danger" role="progressbar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Habilitats
    const abilitiesContainer = document.getElementById('modal-pokemon-abilities');
    abilitiesContainer.innerHTML = pokemon.abilities.map(a => 
        `<li class="list-group-item bg-transparent text-capitalize"><i class="bi bi-check-circle text-success me-2"></i>${a.ability.name.replace('-', ' ')} ${a.is_hidden ? '<small class="text-muted">(Oculta)</small>' : ''}</li>`
    ).join('');

    // Botó Favorit al modal
    updateModalFavButton(pokemon.id);

    // Carregar cadena d'evolució
    loadEvolutions(pokemon.id);

    modal.show();
}

// Carregar evolucions des de la Species API
async function loadEvolutions(pokemonId) {
    const evoContainer = document.getElementById('modal-pokemon-evolutions');
    evoContainer.innerHTML = `<div class="spinner-border spinner-border-sm text-danger" role="status"></div>`;

    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
        const speciesData = await speciesRes.json();
        const evoRes = await fetch(speciesData.evolution_chain.url);
        const evoData = await evoRes.json();

        let chain = [];
        let curr = evoData.chain;
        while (curr) {
            const pId = curr.species.url.split('/').slice(-2, -1)[0];
            chain.push({ name: curr.species.name, id: pId });
            curr = curr.evolves_to[0];
        }

        evoContainer.innerHTML = chain.map((step, index) => {
            const arrow = index < chain.length - 1 ? `<i class="bi bi-arrow-right fs-4 text-muted mx-1"></i>` : '';
            return `
                <div class="d-flex align-items-center">
                    <div class="text-center">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${step.id}.png" style="height:60px;" alt="${step.name}">
                        <div class="small fw-bold text-capitalize">${step.name}</div>
                    </div>
                    ${arrow}
                </div>
            `;
        }).join('');
    } catch (e) {
        evoContainer.innerHTML = `<span class="text-muted small">Sense informació d'evolució</span>`;
    }
}

// 4. GESTIÓ DE FAVORITS
function toggleFavorite(pokemonId) {
    const index = favoriteIds.indexOf(pokemonId);
    if (index === -1) {
        favoriteIds.push(pokemonId);
    } else {
        favoriteIds.splice(index, 1);
    }
    localStorage.setItem('pokedex_favorites', JSON.stringify(favoriteIds));
    updateFavBadge();
    
    // Re-renderitzar vista actual
    filterPokemon();
    renderFavorites();
    if (currentModalPokemon && currentModalPokemon.id === pokemonId) {
        updateModalFavButton(pokemonId);
    }
}

function updateFavBadge() {
    favBadge.textContent = favoriteIds.length;
}

function updateModalFavButton(pokemonId) {
    const isFav = favoriteIds.includes(pokemonId);
    const modalFavBtn = document.getElementById('modal-fav-btn');
    modalFavBtn.innerHTML = `<i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} me-1"></i> ${isFav ? 'Treure de Favorits' : 'Afegir a Favorits'}`;
    modalFavBtn.onclick = () => toggleFavorite(pokemonId);
}

function renderFavorites() {
    favoritesGrid.innerHTML = '';
    const favoritePokemonList = allPokemon.filter(p => favoriteIds.includes(p.id));

    if (favoritePokemonList.length === 0) {
        noFavorites.classList.remove('d-none');
        favoritesGrid.classList.add('d-none');
    } else {
        noFavorites.classList.add('d-none');
        favoritesGrid.classList.remove('d-none');
        favoritePokemonList.forEach(pokemon => {
            const cardHtml = createPokemonCardHTML(pokemon, true);
            favoritesGrid.appendChild(cardHtml);
        });
    }
}

// 5. FILTRES I CERCA
function filterPokemon() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;

    const filtered = allPokemon.filter(pokemon => {
        const matchesName = pokemon.name.toLowerCase().includes(searchTerm) || String(pokemon.id) === searchTerm;
        const matchesType = selectedType === '' || pokemon.types.some(t => t.type.name === selectedType);
        return matchesName && matchesType;
    });

    renderPokemonGrid(filtered);
}

// 6. MINIJOC "QUIN ÉS AQUEST POKÉMON?"
function initGame() {
    document.getElementById('next-pokemon-btn').addEventListener('click', loadGameRound);
    loadGameRound();
}

function loadGameRound() {
    const imgElement = document.getElementById('game-pokemon-img');
    const spinner = document.getElementById('game-spinner');
    const optionsContainer = document.getElementById('game-options');
    const feedback = document.getElementById('game-feedback');
    const nextBtn = document.getElementById('next-pokemon-btn');

    feedback.classList.add('d-none');
    nextBtn.classList.add('d-none');
    imgElement.classList.remove('pokemon-revealed');
    imgElement.classList.add('pokemon-silhouette');
    spinner.classList.remove('d-none');

    // Seleccionar Pokémon aleatori
    const randomIndex = Math.floor(Math.random() * allPokemon.length);
    gameCurrentPokemon = allPokemon[randomIndex];

    // Carregar imatge
    imgElement.src = gameCurrentPokemon.sprites.other['official-artwork'].front_default || gameCurrentPokemon.sprites.front_default;
    imgElement.onload = () => spinner.classList.add('d-none');

    // Generar 3 opcions incorrectes
    let options = [gameCurrentPokemon];
    while (options.length < 4) {
        const randomOpt = allPokemon[Math.floor(Math.random() * allPokemon.length)];
        if (!options.some(o => o.id === randomOpt.id)) {
            options.push(randomOpt);
        }
    }
    // Barrejar opcions
    options.sort(() => Math.random() - 0.5);

    optionsContainer.innerHTML = '';
    options.forEach(opt => {
        const btnCol = document.createElement('div');
        btnCol.className = 'col-6';
        btnCol.innerHTML = `
            <button class="btn btn-outline-secondary w-100 py-2 text-capitalize fw-bold game-opt-btn" onclick="checkAnswer(${opt.id}, this)">
                ${opt.name}
            </button>
        `;
        optionsContainer.appendChild(btnCol);
    });
}

function checkAnswer(selectedId, btnElement) {
    const imgElement = document.getElementById('game-pokemon-img');
    const feedback = document.getElementById('game-feedback');
    const nextBtn = document.getElementById('next-pokemon-btn');
    const optButtons = document.querySelectorAll('.game-opt-btn');

    // Desactivar tots els botons
    optButtons.forEach(btn => btn.disabled = true);

    // Revelar Pokémon
    imgElement.classList.remove('pokemon-silhouette');
    imgElement.classList.add('pokemon-revealed');

    if (selectedId === gameCurrentPokemon.id) {
        gameScore += 10;
        gameStreak += 1;
        btnElement.classList.remove('btn-outline-secondary');
        btnElement.classList.add('btn-success');
        feedback.className = 'alert alert-success my-3 fw-bold';
        feedback.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Correcte! És <strong>${gameCurrentPokemon.name.toUpperCase()}</strong>! (+10 punts)`;
    } else {
        gameStreak = 0;
        btnElement.classList.remove('btn-outline-secondary');
        btnElement.classList.add('btn-danger');
        feedback.className = 'alert alert-danger my-3 fw-bold';
        feedback.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i> Ho sentim! Era <strong>${gameCurrentPokemon.name.toUpperCase()}</strong>.`;
    }

    document.getElementById('game-score').textContent = gameScore;
    document.getElementById('game-streak').textContent = gameStreak;

    feedback.classList.remove('d-none');
    nextBtn.classList.remove('d-none');
}

// 7. EVENT LISTENERS I TEMA
function initEventListeners() {
    searchInput.addEventListener('input', filterPokemon);
    typeFilter.addEventListener('change', filterPokemon);

    // Canvi de pestanyes
    document.getElementById('pills-favorites-tab').addEventListener('click', renderFavorites);

    // Mode Clar / Fosc
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('pokedex_theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('pokedex_theme', theme);
    if (theme === 'dark') {
        themeIcon.className = 'bi bi-sun-fill';
    } else {
        themeIcon.className = 'bi bi-moon-stars-fill';
    }
}
