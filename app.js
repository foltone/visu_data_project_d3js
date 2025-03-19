let globalData = [];
let filteredData = [];

const rowsPerPage = 10;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

function loadData() {
    d3.csv("https://raw.githubusercontent.com/foltone/visu_data_project_d3js/refs/heads/main/data.csv")
        .then(function(data) {
            globalData = data.map(d => {
                return {
                    commune: d.Commune,
                    codeInsee: d["Code Insee"],
                    url: d.url,
                    categorie: normalizeCategory(d.Catégorie),
                    population: +d.Population,
                    site: d.Site,
                    https: d.https,
                    serveur: d.Serveur,
                    versionServeur: d["Version du serveur"],
                    application: d.Application,
                    versionApplication: d["Version de l'application"],
                    langage: d.Langage,
                    versionLangage: d["Version du langage"],
                    latitude: +d.Latitude,
                    longitude: +d.Longitude
                };
            });
            
            globalData = globalData.filter(d => 
                !isNaN(d.latitude) && !isNaN(d.longitude) && 
                d.latitude !== 0 && d.longitude !== 0
            );
            
            filteredData = [...globalData];
            
            initFilters();
            
            createMap();
            createBarChart();
            updateTable();
            
            document.querySelector(".loading").style.display = "none";
        })
        .catch(function(error) {
            console.error("Erreur lors du chargement des données:", error);
            document.querySelector(".loading").style.display = "none";
            alert("Erreur lors du chargement des données. Veuillez vérifier que le fichier data.csv est accessible.");
        });
}

function normalizeCategory(category) {
    if (category.includes("Ã")) {
        return category.replace("Ã ", "à");
    }
    return category;
}

function initFilters() {
    const categories = [...new Set(globalData.map(d => d.categorie))];
    const categorySelect = document.getElementById('filter-category');
    categorySelect.innerHTML = '<option value="all">Toutes les catégories</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    const servers = [...new Set(globalData.map(d => d.serveur))];
    const serverSelect = document.getElementById('filter-server');
    serverSelect.innerHTML = '<option value="all">Tous les serveurs</option>';
    servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server;
        option.textContent = server;
        serverSelect.appendChild(option);
    });
    
    document.getElementById('filter-category').addEventListener('change', applyFilters);
    document.getElementById('filter-server').addEventListener('change', applyFilters);
    document.getElementById('filter-https').addEventListener('change', applyFilters);
    document.getElementById('filter-population').addEventListener('input', applyFilters);
}

function applyFilters() {
    const categoryFilter = document.getElementById('filter-category').value;
    const serverFilter = document.getElementById('filter-server').value;
    const httpsFilter = document.getElementById('filter-https').value;
    const populationFilter = parseInt(document.getElementById('filter-population').value);
    
    filteredData = globalData.filter(d => {
        return (categoryFilter === 'all' || d.categorie === categoryFilter) &&
               (serverFilter === 'all' || d.serveur === serverFilter) &&
               (httpsFilter === 'all' || d.https === httpsFilter) &&
               (isNaN(populationFilter) || d.population >= populationFilter);
    });
    
    currentPage = 1;
    
    updateMap();
    updateBarChart();
    updateTable();
}

function createMap() {
    const width = document.getElementById('map').clientWidth;
    const height = 500;
    
    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    const g = svg.append("g");
    
    const projection = d3.geoMercator()
        .center([2.5, 46.5])
        .scale(width * 2.5)
        .translate([width / 2, height / 2]);
    
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    g.selectAll("circle")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", d => Math.sqrt(d.population) / 20)
        .style("fill", d => {
            if (d.categorie === "À jour") return "#2ecc71";
            if (d.categorie === "Partiellement à jour") return "#f39c12";
            return "#e74c3c";
        })
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <h3>${d.commune}</h3>
                <p><strong>Population:</strong> ${d.population.toLocaleString()}</p>
                <p><strong>Catégorie:</strong> ${d.categorie}</p>
                <p><strong>Serveur:</strong> ${d.serveur} ${d.versionServeur}</p>
                <p><strong>Application:</strong> ${d.application} ${d.versionApplication}</p>
                <p><strong>HTTPS:</strong> ${d.https}</p>
                <p><a href="${d.url}" target="_blank">${d.url}</a></p>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function updateMap() {
    const width = document.getElementById('map').clientWidth;
    const height = 500;
    
    const projection = d3.geoMercator()
        .center([2.5, 46.5])
        .scale(width * 2.5)
        .translate([width / 2, height / 2]);
    
    const svg = d3.select("#map svg");
    
    const dots = svg.select("g").selectAll(".dot")
        .data(filteredData, d => d.codeInsee);
    
    dots.exit().remove();
    
    dots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", 0)
        .style("fill", d => {
            if (d.categorie === "À jour") return "#2ecc71";
            if (d.categorie === "Partiellement à jour") return "#f39c12";
            return "#e74c3c";
        })
        .on("mouseover", function(event, d) {
            const tooltip = d3.select("body").select(".tooltip");
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <h3>${d.commune}</h3>
                <p><strong>Population:</strong> ${d.population.toLocaleString()}</p>
                <p><strong>Catégorie:</strong> ${d.categorie}</p>
                <p><strong>Serveur:</strong> ${d.serveur} ${d.versionServeur}</p>
                <p><strong>Application:</strong> ${d.application} ${d.versionApplication}</p>
                <p><strong>HTTPS:</strong> ${d.https}</p>
                <p><a href="${d.url}" target="_blank">${d.url}</a></p>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select("body").select(".tooltip").transition()
                .duration(500)
                .style("opacity", 0);
        })
        .transition()
        .duration(500)
        .attr("r", d => Math.sqrt(d.population) / 20);
    
    dots.transition()
        .duration(500)
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", d => Math.sqrt(d.population) / 20)
        .style("fill", d => {
            if (d.categorie === "À jour") return "#2ecc71";
            if (d.categorie === "Partiellement à jour") return "#f39c12";
            return "#e74c3c";
        });
}

function createBarChart() {
    const width = document.getElementById('chart-container').clientWidth - 50;
    const height = 300;
    const margin = {top: 30, right: 20, bottom: 80, left: 60};
    
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const serverCounts = d3.rollups(
        filteredData,
        v => v.length,
        d => d.serveur
    ).sort((a, b) => b[1] - a[1]);
    
    const x = d3.scaleBand()
        .domain(serverCounts.map(d => d[0]))
        .range([0, width])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(serverCounts, d => d[1])])
        .nice()
        .range([height, 0]);
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y));
    
    svg.selectAll(".bar")
        .data(serverCounts)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[1]))
        .attr("height", d => height - y(d[1]));
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Répartition des serveurs web");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Nombre de communes");
}

function updateBarChart() {
    const serverCounts = d3.rollups(
        filteredData,
        v => v.length,
        d => d.serveur
    ).sort((a, b) => b[1] - a[1]);
    
    const width = document.getElementById('chart-container').clientWidth - 50;
    const height = 300;
    
    const svg = d3.select("#chart-container svg g");
    
    const x = d3.scaleBand()
        .domain(serverCounts.map(d => d[0]))
        .range([0, width])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(serverCounts, d => d[1])])
        .nice()
        .range([height, 0]);
    
    svg.select(".x.axis")
        .transition()
        .duration(500)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    svg.select(".y.axis")
        .transition()
        .duration(500)
        .call(d3.axisLeft(y));
    
    const bars = svg.selectAll(".bar")
        .data(serverCounts);
    
    bars.exit()
        .transition()
        .duration(500)
        .attr("y", height)
        .attr("height", 0)
        .remove();
    
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", d => y(d[1]))
        .attr("height", d => height - y(d[1]));
    
    bars.transition()
        .duration(500)
        .attr("x", d => x(d[0]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[1]))
        .attr("height", d => height - y(d[1]));
}

function updateTable() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIdx, endIdx);
    
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    pageData.forEach(d => {
        const row = document.createElement('tr');
        
        const communeCell = document.createElement('td');
        communeCell.textContent = d.commune;
        row.appendChild(communeCell);
        
        const codeInseeCell = document.createElement('td');
        codeInseeCell.textContent = d.codeInsee;
        row.appendChild(codeInseeCell);
        
        const populationCell = document.createElement('td');
        populationCell.textContent = d.population.toLocaleString();
        row.appendChild(populationCell);
        
        const categorieCell = document.createElement('td');
        categorieCell.textContent = d.categorie;
        row.appendChild(categorieCell);
        
        const serveurCell = document.createElement('td');
        serveurCell.textContent = d.serveur + (d.versionServeur !== "Inconnue" ? " " + d.versionServeur : "");
        row.appendChild(serveurCell);
        
        const applicationCell = document.createElement('td');
        applicationCell.textContent = d.application + (d.versionApplication !== "Inconnue" ? " " + d.versionApplication : "");
        row.appendChild(applicationCell);
        
        const httpsCell = document.createElement('td');
        httpsCell.textContent = d.https;
        row.appendChild(httpsCell);
        
        const urlCell = document.createElement('td');
        const urlLink = document.createElement('a');
        urlLink.href = d.url;
        urlLink.textContent = d.url;
        urlLink.target = "_blank";
        urlCell.appendChild(urlLink);
        row.appendChild(urlCell);
        
        tableBody.appendChild(row);
    });
    
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    const prevButton = document.createElement('button');
    prevButton.textContent = '«';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    });
    paginationContainer.appendChild(prevButton);
    
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        pageButton.addEventListener('click', () => {
            currentPage = i;
            updateTable();
        });
        paginationContainer.appendChild(pageButton);
    }
    
    const nextButton = document.createElement('button');
    nextButton.textContent = '»';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    });
    paginationContainer.appendChild(nextButton);
}
