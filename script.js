document.addEventListener('DOMContentLoaded', function() {
    const API_KEY = 'bd5e378503939ddaee76f12ad7a97608';
    const locationInput = document.getElementById('location-input');
    const searchBtn = document.getElementById('search-btn');
    const suggestions = document.getElementById('suggestions');
    const historyItems = document.getElementById('history-items');
    const weatherCard = document.getElementById('weather-card');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const body = document.body;

    // Weather display elements
    const cityName = document.getElementById('city-name');
    const weatherIcon = document.getElementById('weather-icon');
    const temperature = document.getElementById('temperature');
    const humidity = document.getElementById('humidity');
    const wind = document.getElementById('wind');
    const feelsLike = document.getElementById('feels-like');
    const condition = document.getElementById('condition');
    const currentDate = document.getElementById('current-date');

    // Forecast elements
    const hourlyItems = document.getElementById('hourly-items');
    const dailyItems = document.getElementById('daily-items');
    const weekendItems = document.getElementById('weekend-items');

    // Calendar elements
    const calendarBody = document.getElementById('calendar-body');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // Forecast tabs
    const forecastTabs = document.querySelectorAll('.forecast-tab');
    const forecastContents = document.querySelectorAll('.forecast-content');

    // Popular cities for suggestions
    const popularCities = [
        "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
        "Kolkata", "London", "New York", "Tokyo", "Paris",
        "Dubai", "Singapore", "Sydney", "Berlin", "Toronto"
    ];

    // Current date and calendar state
    let currentDateObj = new Date();
    let currentMonth = currentDateObj.getMonth();
    let currentYear = currentDateObj.getFullYear();
    let currentCity = '';
    let forecastData = null;

    // Initialize application
    function init() {
        updateDate();
        setInterval(updateDate, 60000);
        loadHistory();
        generateCalendar(currentMonth, currentYear);
        setupEventListeners();
        
        // Try to get user's location automatically
        getGeolocationWeather();
    }

    function setupEventListeners() {
        searchBtn.addEventListener('click', fetchWeather);
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') fetchWeather();
        });

        prevMonthBtn.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar(currentMonth, currentYear);
        });

        nextMonthBtn.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar(currentMonth, currentYear);
        });

        locationInput.addEventListener('input', function() {
            const input = this.value.toLowerCase();
            if (input.length > 1) {
                showSuggestions(input);
            } else {
                suggestions.style.display = 'none';
            }
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-container')) {
                suggestions.style.display = 'none';
            }
        });

        forecastTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                forecastTabs.forEach(t => {
                    const isSelected = t === this;
                    t.classList.toggle('active', isSelected);
                    t.setAttribute('aria-selected', isSelected);
                });
                
                forecastContents.forEach(content => {
                    const isActive = content.id === `${tabId}-forecast`;
                    content.classList.toggle('active', isActive);
                    content.hidden = !isActive;
                });
            });
        });
    }

    async function fetchWeather() {
        const location = locationInput.value.trim();
        if (!location) {
            showError('Please enter a location');
            return;
        }

        showLoading(true);
        clearDisplay();
        suggestions.style.display = 'none';

        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric`
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch weather data');
            }

            const data = await response.json();
            
            if (!data || data.cod !== 200 || !data.weather || data.weather.length === 0) {
                throw new Error(data.message || 'Weather data not available');
            }
            
            currentCity = data.name;
            displayWeather(data);
            setBackground(data.weather[0].id);
            addToHistory(location);
            
            // Fetch forecast data
            const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${API_KEY}&units=metric`
            );
            
            if (!forecastResponse.ok) {
                throw new Error('Failed to fetch forecast data');
            }
            
            forecastData = await forecastResponse.json();
            
            if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
                throw new Error('Invalid forecast data received');
            }
            
            displayForecast(forecastData);
            generatePredictions(data, forecastData);
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'Failed to get weather data');
        } finally {
            showLoading(false);
        }
    }

    async function getGeolocationWeather() {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by your browser");
            return;
        }

        showLoading(true);
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            const { latitude, longitude } = position.coords;
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }

            const data = await response.json();
            
            if (!data || data.cod !== 200 || !data.weather || data.weather.length === 0) {
                throw new Error(data.message || 'Weather data not available');
            }
            
            currentCity = data.name;
            locationInput.value = data.name;
            displayWeather(data);
            setBackground(data.weather[0].id);
            addToHistory(data.name);
            
            // Fetch forecast data
            const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
            );
            
            if (!forecastResponse.ok) {
                throw new Error('Failed to fetch forecast data');
            }
            
            forecastData = await forecastResponse.json();
            
            if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
                throw new Error('Invalid forecast data received');
            }
            
            displayForecast(forecastData);
            generatePredictions(data, forecastData);
            
        } catch (error) {
            console.error('Geolocation error:', error);
            // Don't show error to user - just fail silently
        } finally {
            showLoading(false);
        }
    }

    function displayWeather(data) {
        if (!data || !data.main || !data.weather || data.weather.length === 0) {
            showError('Invalid weather data received');
            return;
        }

        cityName.textContent = `${data.name || 'Unknown'}, ${data.sys?.country || ''}`;
        temperature.textContent = `${Math.round(data.main.temp)}°C`;
        humidity.textContent = `${data.main.humidity}%`;
        wind.textContent = `${data.wind?.speed || '--'} m/s`;
        feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
        
        const weatherCondition = data.weather[0];
        condition.textContent = weatherCondition.description.charAt(0).toUpperCase() + 
                               weatherCondition.description.slice(1);
        
        const iconCode = weatherCondition.icon;
        weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" 
                                alt="${weatherCondition.description}" class="weather-icon">`;
        
        weatherCard.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function displayForecast(data) {
        if (!data || !data.list || data.list.length === 0) {
            console.error('Invalid forecast data');
            return;
        }

        hourlyItems.innerHTML = '';
        dailyItems.innerHTML = '';
        
        const dailyForecasts = {};
        data.list.forEach(item => {
            if (!item.dt || !item.main || !item.weather || item.weather.length === 0) {
                console.warn('Invalid forecast item', item);
                return;
            }
            
            const date = new Date(item.dt * 1000);
            const dateStr = date.toLocaleDateString();
            
            if (!dailyForecasts[dateStr]) {
                dailyForecasts[dateStr] = [];
            }
            dailyForecasts[dateStr].push(item);
        });
        
        // Display hourly forecast (first 8 items)
        const hourlyForecast = data.list.slice(0, 8);
        hourlyForecast.forEach(item => {
            const time = new Date(item.dt * 1000);
            const hour = time.getHours();
            const temp = Math.round(item.main.temp);
            const icon = item.weather[0].icon;
            
            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            hourlyItem.innerHTML = `
                <div>${hour}:00</div>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${item.weather[0].description}">
                <div>${temp}°C</div>
            `;
            hourlyItems.appendChild(hourlyItem);
        });
        
        // Display 5-day forecast
        const dailyDates = Object.keys(dailyForecasts);
        dailyDates.slice(0, 10).forEach(dateStr => {
            const dayForecast = dailyForecasts[dateStr];
            const date = new Date(dayForecast[0].dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const dayTemp = Math.round(dayForecast[0].main.temp);
            const nightTemp = Math.round(dayForecast[dayForecast.length - 1].main.temp);
            const icon = dayForecast[0].weather[0].icon;
            
            const dailyItem = document.createElement('div');
            dailyItem.className = 'daily-item';
            dailyItem.innerHTML = `
                <div>
                    <div>${dayName}</div>
                    <div>${date.toLocaleDateString()}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${dayForecast[0].weather[0].description}">
                    <div>
                        <div>Day: ${dayTemp}°C</div>
                        <div>Night: ${nightTemp}°C</div>
                    </div>
                </div>
            `;
            dailyItems.appendChild(dailyItem);
        });

        displayWeekendForecast(dailyForecasts);
    }

    function displayWeekendForecast(dailyForecasts) {
        const dates = Object.keys(dailyForecasts);
        const weekendDays = [];
        
        dates.forEach(dateStr => {
            const date = new Date(dateStr);
            if (date.getDay() === 0 || date.getDay() === 6) {
                weekendDays.push({
                    date: date,
                    forecast: dailyForecasts[dateStr]
                });
            }
        });
        
        if (weekendDays.length === 0) {
            weekendItems.innerHTML = '<p>No weekend days in the current forecast period.</p>';
            return;
        }
        
        let weekendHTML = '<div class="weekend-item">';
        
        weekendDays.forEach(day => {
            const dayName = day.date.toLocaleDateString('en-US', { weekday: 'long' });
            const dateStr = day.date.toLocaleDateString();
            const dayTemp = Math.round(day.forecast[0].main.temp);
            const nightTemp = Math.round(day.forecast[day.forecast.length - 1].main.temp);
            const icon = day.forecast[0].weather[0].icon;
            const condition = day.forecast[0].weather[0].description;
            const humidity = day.forecast[0].main.humidity;
            const wind = day.forecast[0].wind.speed;
            
            weekendHTML += `
                <div class="weekend-day">
                    <h4>${dayName} (${dateStr})</h4>
                    <div style="display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0;">
                        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${condition}">
                        <div>${condition}</div>
                    </div>
                    <div>Day: ${dayTemp}°C</div>
                    <div>Night: ${nightTemp}°C</div>
                    <div>Humidity: ${humidity}%</div>
                    <div>Wind: ${wind} m/s</div>
                </div>
            `;
        });
        
        weekendHTML += '</div>';
        weekendItems.innerHTML = weekendHTML;
    }

    function generateCalendar(month, year) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        currentMonthYear.textContent = `${monthNames[month]} ${year}`;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        calendarBody.innerHTML = '';
        
        let date = 1;
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                cell.className = 'calendar-day';
                
                if (i === 0 && j < firstDay) {
                    cell.textContent = '';
                } else if (date > daysInMonth) {
                    cell.textContent = '';
                } else {
                    const dayDiv = document.createElement('div');
                    dayDiv.className = 'calendar-date';
                    dayDiv.textContent = date;
                    
                    const weatherDiv = document.createElement('div');
                    weatherDiv.className = 'calendar-weather';
                    weatherDiv.innerHTML = `
                        <div>☀️ 24°C</div>
                        <div>🌙 18°C</div>
                    `;
                    
                    cell.appendChild(dayDiv);
                    cell.appendChild(weatherDiv);
                    
                    const today = new Date();
                    if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                        cell.classList.add('current-day');
                    }
                    
                    date++;
                }
                
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
            
            if (date > daysInMonth) {
                break;
            }
        }
    }

    function generatePredictions(currentWeather, forecast) {
        if (!currentWeather || !forecast) return;

        const predictions = [
            {
                title: "Pollen Forecast",
                description: currentWeather.weather?.[0]?.main === "Rain" ? 
                    "Low pollen levels expected due to rain." : 
                    "Moderate pollen levels expected."
            },
            {
                title: "UV Index",
                description: currentWeather.clouds?.all < 30 ? 
                    "High UV index expected. Wear sunscreen!" : 
                    "Moderate UV index expected."
            },
            {
                title: "Outdoor Activity",
                description: currentWeather.weather?.[0]?.main === "Rain" ? 
                    "Not ideal for outdoor activities." : 
                    "Great day for outdoor activities!"
            },
            {
                title: "Energy Consumption",
                description: currentWeather.main?.temp > 25 ? 
                    "Higher than average energy consumption expected due to cooling needs." : 
                    "Normal energy consumption expected."
            }
        ];
        
        const todayForecast = document.getElementById('today-forecast');
        let predictionsHTML = '<div class="prediction-cards">';
        
        predictions.forEach(pred => {
            predictionsHTML += `
                <div class="prediction-card">
                    <div class="prediction-title">${pred.title}</div>
                    <div>${pred.description}</div>
                </div>
            `;
        });
        
        predictionsHTML += '</div>';
        todayForecast.innerHTML = `<h3>Today's Forecast</h3>${predictionsHTML}`;
    }

    function showSuggestions(input) {
        const matchedCities = popularCities.filter(city => 
            city.toLowerCase().includes(input)
        );

        suggestions.innerHTML = '';
        if (matchedCities.length > 0) {
            matchedCities.forEach(city => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = city;
                div.setAttribute('role', 'option');
                div.addEventListener('click', function() {
                    locationInput.value = city;
                    suggestions.style.display = 'none';
                    fetchWeather();
                });
                suggestions.appendChild(div);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    }

    function setBackground(weatherId) {
        if (!weatherId) return;
        
        body.className = '';
        
        if (weatherId >= 200 && weatherId < 300) {
            body.classList.add('thunderstorm-bg');
        } else if (weatherId >= 300 && weatherId < 600) {
            body.classList.add('rain-bg');
        } else if (weatherId >= 600 && weatherId < 700) {
            body.classList.add('snow-bg');
        } else if (weatherId === 800) {
            body.classList.add('clear-sky-bg');
        } else if (weatherId > 800) {
            body.classList.add('clouds-bg');
        } else {
            body.classList.add('mist-bg');
        }
    }

    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
        historyItems.innerHTML = '';
        
        history.forEach(city => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = city;
            item.setAttribute('role', 'listitem');
            item.addEventListener('click', function() {
                locationInput.value = city;
                fetchWeather();
            });
            historyItems.appendChild(item);
        });
    }

    function addToHistory(city) {
        let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
        
        history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
        history.unshift(city);
        
        if (history.length > 5) {
            history = history.slice(0, 5);
        }
        
        localStorage.setItem('weatherHistory', JSON.stringify(history));
        loadHistory();
    }

    function showLoading(show) {
        loading.style.display = show ? 'block' : 'none';
    }

    function clearDisplay() {
        weatherCard.style.display = 'none';
        errorMessage.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        weatherCard.style.display = 'none';
    }

    // Initialize the application
    init();
});