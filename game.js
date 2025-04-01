class BrakeMaster {
    constructor() {
        this.car = document.getElementById('car');
        this.stopLine = document.getElementById('stop-line');
        this.scoreElement = document.getElementById('score');
        this.distanceElement = document.getElementById('distance');
        this.bestScoreElement = document.getElementById('best-score');
        this.startButton = document.getElementById('start-button');
        this.scoreEffect = document.getElementById('score-effect');
        
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.isMoving = false;
        this.isBraking = false;
        this.speed = 0;
        this.initialSpeed = 25;
        this.gameLoop = null;
        this.lastTime = 0;
        this.frameInterval = 1000 / 60; // 60 FPS
        this.carWidth = 60; // 자동차의 너비
        
        // 날씨 설정
        this.weather = 'normal'; // 'normal', 'rain', 'snow'
        this.weatherEffects = {
            normal: { 
                friction: 0.05,  // 마찰력을 줄여서 더 많이 미끄러지도록 수정
                brakingDistance: 1,
                slideEffect: 1.2  // 미끄러짐 효과 증가
            },
            rain: { 
                friction: 0.02, 
                brakingDistance: 2,
                slideEffect: 2.0
            },
            snow: { 
                friction: 0.01, 
                brakingDistance: 3,
                slideEffect: 3.0
            }
        };
        
        // 눈송이 컨테이너
        this.snowflakesContainer = null;
        
        // 레벨 시스템
        this.level = 1;
        this.levelElement = document.createElement('div');
        this.levelElement.id = 'level';
        this.levelElement.textContent = `레벨 ${this.level}`;
        document.querySelector('.game-info').appendChild(this.levelElement);
        
        // 코인 시스템
        this.coins = parseInt(localStorage.getItem('coins')) || 0;
        this.coinElement = document.createElement('div');
        this.coinElement.id = 'coins';
        this.coinElement.textContent = `코인 ${this.coins}`;
        document.querySelector('.game-info').appendChild(this.coinElement);
        
        // 업그레이드 시스템
        this.upgrades = {
            brake: parseInt(localStorage.getItem('upgrade_brake')) || 1,
            acceleration: parseInt(localStorage.getItem('upgrade_acceleration')) || 1,
            vision: parseInt(localStorage.getItem('upgrade_vision')) || 1
        };
        
        // 도전 과제 시스템
        this.achievements = {
            perfectStops: parseInt(localStorage.getItem('achievement_perfect')) || 0,
            consecutiveSuccess: parseInt(localStorage.getItem('achievement_consecutive')) || 0,
            snowScore: parseInt(localStorage.getItem('achievement_snow')) || 0
        };
        
        // 업그레이드 효과 설정
        this.upgradeEffects = {
            brake: 1.2,    // 브레이크 성능 20% 향상
            acceleration: 1.3, // 가속도 30% 향상
            vision: 1.1    // 시야 10% 향상
        };
        
        // 업그레이드 레벨에 따른 효과 배수
        this.upgradeMultipliers = {
            brake: 1.2,
            acceleration: 1.3,
            vision: 1.1
        };
        
        this.init();
    }
    
    init() {
        this.bestScoreElement.textContent = this.bestScore;
        this.setupEventListeners();
        this.resetGame();
        this.updateDistance(); // 초기 거리 표시
        this.setRandomWeather();
        this.createUpgradeMenu();
        this.createAchievementMenu();
    }
    
    createSnowflakes() {
        // 기존 눈송이 컨테이너 제거
        if (this.snowflakesContainer) {
            this.snowflakesContainer.remove();
        }
        
        // 새로운 눈송이 컨테이너 생성
        this.snowflakesContainer = document.createElement('div');
        this.snowflakesContainer.className = 'snowflakes';
        document.body.appendChild(this.snowflakesContainer);
        
        // 50개의 눈송이 생성
        for (let i = 0; i < 50; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            
            // 랜덤한 크기, 위치, 애니메이션 지속시간 설정
            const size = Math.random() * 5 + 2;
            const left = Math.random() * 100;
            const animationDuration = Math.random() * 3 + 2;
            const delay = Math.random() * 2;
            
            snowflake.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${left}%;
                animation-duration: ${animationDuration}s;
                animation-delay: -${delay}s;
            `;
            
            this.snowflakesContainer.appendChild(snowflake);
        }
    }
    
    setRandomWeather() {
        const weathers = ['normal', 'rain', 'snow'];
        this.weather = weathers[Math.floor(Math.random() * weathers.length)];
        document.body.className = `weather-${this.weather}`;
        // 날씨에 따른 초기 속도 조정
        this.speed = this.initialSpeed * this.weatherEffects[this.weather].brakingDistance;
        
        // 눈이 내리는 경우 눈송이 생성
        if (this.weather === 'snow') {
            this.createSnowflakes();
        } else if (this.snowflakesContainer) {
            this.snowflakesContainer.remove();
            this.snowflakesContainer = null;
        }
    }
    
    setupEventListeners() {
        // 출발 버튼 클릭 이벤트
        this.startButton.addEventListener('click', () => {
            if (!this.isMoving) {
                this.startGame();
            }
        });

        // 스페이스바 정지 이벤트
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isMoving && !this.isBraking) {
                this.startBraking();  // brake() 대신 startBraking() 호출
            }
        });
    }
    
    startGame() {
        this.isMoving = true;
        this.isBraking = false;
        this.startButton.disabled = true;
        this.lastTime = performance.now();
        this.setRandomWeather();
        
        // 점수 초기화
        this.score = 0;
        this.scoreElement.textContent = '0';
        this.distanceElement.textContent = '0.0';
        
        // 레벨과 업그레이드에 따른 초기 속도 설정
        const baseSpeed = 2.5 + (this.level - 1) * 0.5;
        this.speed = baseSpeed * this.upgradeEffects.acceleration;
        
        this.gameLoop = requestAnimationFrame((timestamp) => this.update(timestamp));
    }
    
    startBraking() {
        this.isBraking = true;
    }
    
    update(timestamp) {
        if (!this.isMoving) return;
        
        const deltaTime = timestamp - this.lastTime;
        if (deltaTime >= this.frameInterval) {
            const currentLeft = parseFloat(this.car.style.left) || 50;
            
            // 브레이크가 작동 중일 때
            if (this.isBraking) {
                const friction = this.weatherEffects[this.weather].friction * this.upgradeEffects.brake;
                this.speed = Math.max(0, this.speed - friction);
                
                // 제동거리 밀리는 이펙트 (속도에 비례하여 자연스럽게 감속)
                const slideEffect = this.weatherEffects[this.weather].slideEffect;
                const slideDistance = this.speed * slideEffect * 0.1; // 0.1을 곱해서 더 자연스럽게 조정
                this.car.style.left = `${currentLeft + slideDistance}px`;
                
                // 완전히 멈췄을 때
                if (this.speed <= 0) {
                    this.speed = 0;
                    this.brake();
                    return;
                }
            } else {
                this.car.style.left = `${currentLeft + this.speed}px`;
            }
            
            // 정지선에 도달했는지 확인
            const stopLineLeft = this.stopLine.offsetLeft;
            const carRight = currentLeft + this.carWidth;
            
            // 실시간으로 거리 업데이트
            this.updateDistance();
            
            if (carRight >= stopLineLeft) {
                this.gameOver();
                return;
            }
            
            this.lastTime = timestamp;
        }
        
        this.gameLoop = requestAnimationFrame((timestamp) => this.update(timestamp));
    }
    
    updateDistance() {
        const carLeft = parseFloat(this.car.style.left) || 50;
        const carRight = carLeft + this.carWidth;
        const stopLineLeft = this.stopLine.offsetLeft;
        const distance = this.calculateDistance(carRight, stopLineLeft);
        const distanceInMeters = (distance * 0.1).toFixed(1);
        
        // 이전 거리와 비교하여 변화 효과 추가
        const prevDistance = parseFloat(this.distanceElement.textContent) || 0;
        const newDistance = parseFloat(distanceInMeters);
        
        this.distanceElement.textContent = distanceInMeters;
        
        // 거리 변화에 따른 시각적 효과와 점수 증가
        if (newDistance < prevDistance) {
            this.distanceElement.classList.add('distance-down');
            setTimeout(() => this.distanceElement.classList.remove('distance-down'), 300);
            
            // 거리가 줄어들면 점수 증가
            const scoreIncrease = Math.floor((prevDistance - newDistance) * 10); // 점수 증가량 조정
            this.score += scoreIncrease;
            this.scoreElement.textContent = this.score;
            this.scoreElement.classList.add('score-up');
            setTimeout(() => this.scoreElement.classList.remove('score-up'), 300);
        } else if (newDistance > prevDistance) {
            this.distanceElement.classList.add('distance-up');
            setTimeout(() => this.distanceElement.classList.remove('distance-up'), 300);
        }
    }
    
    calculateDistance(carRight, stopLineLeft) {
        // 정지선을 넘어간 경우 음수 거리 반환
        if (carRight > stopLineLeft) {
            return -(carRight - stopLineLeft);
        }
        // 정지선까지의 거리 반환
        return stopLineLeft - carRight;
    }
    
    brake() {
        if (!this.isMoving) return;
        
        cancelAnimationFrame(this.gameLoop);
        this.isMoving = false;
        this.isBraking = false;
        
        const carLeft = parseFloat(this.car.style.left);
        const carRight = carLeft + this.carWidth;
        const stopLineLeft = this.stopLine.offsetLeft;
        const distance = this.calculateDistance(carRight, stopLineLeft);
        
        // 정지선을 넘어간 경우
        if (distance < 0) {
            this.gameOver();
            return;
        }
        
        // 거리를 미터 단위로 변환 (1픽셀 = 0.1미터)
        const distanceInMeters = (distance * 0.1).toFixed(1);
        this.distanceElement.textContent = distanceInMeters;
        
        // 최종 점수 계산
        const finalScore = this.calculateScore(distance);
        this.score = finalScore;
        this.scoreElement.textContent = this.score;
        
        // 코인 획득 (점수의 10%)
        const earnedCoins = Math.floor(this.score * 0.1);
        this.coins += earnedCoins;
        localStorage.setItem('coins', this.coins);
        this.coinElement.textContent = `코인 ${this.coins}`;
        
        // 도전 과제 업데이트
        this.updateAchievements(distance);
        
        // 레벨 업 체크
        this.checkLevelUp();
        
        // 최고 점수 업데이트
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreElement.classList.add('score-up');
            setTimeout(() => this.bestScoreElement.classList.remove('score-up'), 300);
        }
        
        // 2초 후 게임 리셋
        setTimeout(() => this.resetGame(), 2000);
    }
    
    calculateScore(distance) {
        let score = this.score; // 현재까지의 점수를 기본으로 사용
        let bonusText = '';
        
        // 거리에 따른 보너스 점수
        if (Math.abs(distance) <= 2) {
            score += 3000;
            bonusText = '✨ PERFECT! +3000 ✨';
        } else if (Math.abs(distance) <= 5) {
            score += 2000;
            bonusText = '🌟 GREAT! +2000 🌟';
        } else if (Math.abs(distance) <= 10) {
            score += 1000;
            bonusText = '⭐ GOOD! +1000 ⭐';
        }
        
        // 날씨 페널티
        if (this.weather === 'rain') {
            score = Math.floor(score * 0.8);
            bonusText += ' 🌧️ (비 -20%)';
        } else if (this.weather === 'snow') {
            score = Math.floor(score * 0.7);
            bonusText += ' ❄️ (눈 -30%)';
        }
        
        // 점수 효과 표시
        this.scoreEffect.textContent = bonusText;
        this.scoreEffect.className = Math.abs(distance) <= 2 ? 'score-perfect' : 'score-bonus';
        this.scoreEffect.style.left = `${this.car.offsetLeft}px`;
        this.scoreEffect.style.top = '50%';
        
        // 점수 효과 리셋
        this.scoreEffect.style.animation = 'none';
        this.scoreEffect.offsetHeight; // 리플로우 강제
        this.scoreEffect.style.animation = null;
        
        return score;
    }
    
    gameOver() {
        cancelAnimationFrame(this.gameLoop);
        this.isMoving = false;
        this.isBraking = false;
        this.car.style.backgroundColor = '#ff0000';
        this.stopLine.style.backgroundColor = '#ff0000';
        alert(`게임 오버! 정지선을 지나쳤습니다.\n현재 날씨: ${this.weather}`);
        setTimeout(() => this.resetGame(), 1000);
    }
    
    resetGame() {
        this.car.style.left = '50px';
        this.car.style.backgroundColor = '#ff0000';
        this.stopLine.style.backgroundColor = '#ff0000';
        this.isMoving = false;
        this.isBraking = false;
        this.speed = this.initialSpeed;
        this.startButton.disabled = false;
        this.updateDistance(); // 거리 초기화
    }

    createUpgradeMenu() {
        // 기존 메뉴 제거
        const existingMenu = document.querySelector('.upgrade-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'upgrade-menu';
        menu.innerHTML = `
            <h2>업그레이드</h2>
            <div class="upgrade-item">
                <span>브레이크 성능 (${this.upgrades.brake}레벨)</span>
                <button onclick="window.game.upgrade('brake')">${this.getUpgradeCost('brake')}코인</button>
            </div>
            <div class="upgrade-item">
                <span>가속도 (${this.upgrades.acceleration}레벨)</span>
                <button onclick="window.game.upgrade('acceleration')">${this.getUpgradeCost('acceleration')}코인</button>
            </div>
            <div class="upgrade-item">
                <span>시야 확장 (${this.upgrades.vision}레벨)</span>
                <button onclick="window.game.upgrade('vision')">${this.getUpgradeCost('vision')}코인</button>
            </div>
        `;
        document.body.appendChild(menu);
    }

    createAchievementMenu() {
        const menu = document.createElement('div');
        menu.className = 'achievement-menu';
        menu.innerHTML = `
            <h2>도전 과제</h2>
            <div class="achievement-item">
                <span>PERFECT 정지</span>
                <div class="progress">${this.achievements.perfectStops}/10</div>
            </div>
            <div class="achievement-item">
                <span>연속 성공</span>
                <div class="progress">${this.achievements.consecutiveSuccess}/5</div>
            </div>
            <div class="achievement-item">
                <span>눈이 내리는 날 1000점</span>
                <div class="progress">${this.achievements.snowScore}/1000</div>
            </div>
        `;
        document.body.appendChild(menu);
    }

    getUpgradeCost(type) {
        const baseCost = {
            brake: 100,
            acceleration: 150,
            vision: 200
        };
        return Math.floor(baseCost[type] * Math.pow(1.5, this.upgrades[type] - 1));
    }

    upgrade(type) {
        const cost = this.getUpgradeCost(type);
        if (this.coins >= cost) {
            this.coins -= cost;
            this.upgrades[type]++;
            
            // 업그레이드 효과 계산
            this.upgradeEffects[type] = Math.pow(this.upgradeMultipliers[type], this.upgrades[type] - 1);
            
            // 저장
            localStorage.setItem('coins', this.coins);
            localStorage.setItem(`upgrade_${type}`, this.upgrades[type]);
            
            // UI 업데이트
            this.coinElement.textContent = `코인 ${this.coins}`;
            this.showUpgradeEffect(type);
            this.createUpgradeMenu();
        } else {
            alert('코인이 부족합니다!');
        }
    }

    showUpgradeEffect(type) {
        const effect = document.createElement('div');
        effect.className = 'upgrade-effect';
        effect.textContent = `${type} 업그레이드 완료! (${this.upgrades[type]}레벨)`;
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 2000);
    }

    updateAchievements(distance) {
        if (Math.abs(distance) <= 2) {
            this.achievements.perfectStops++;
            localStorage.setItem('achievement_perfect', this.achievements.perfectStops);
        }
        
        if (this.weather === 'snow' && this.score >= 1000) {
            this.achievements.snowScore = 1000;
            localStorage.setItem('achievement_snow', this.achievements.snowScore);
        }
        
        this.createAchievementMenu(); // 메뉴 새로고침
    }

    checkLevelUp() {
        const nextLevelScore = this.level * 1000;
        if (this.score >= nextLevelScore) {
            this.level++;
            this.levelElement.textContent = `레벨 ${this.level}`;
            this.showLevelUpEffect();
        }
    }

    showLevelUpEffect() {
        const effect = document.createElement('div');
        effect.className = 'level-up-effect';
        effect.textContent = `레벨 ${this.level} 달성!`;
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 2000);
    }
}

// 게임 시작
window.onload = () => {
    window.game = new BrakeMaster();
};

function calculateScore() {
    const distance = Math.abs(carPosition - stopLinePosition);
    const baseScore = Math.floor(Math.random() * 901) + 100; // 100~1000 사이의 랜덤 점수
    let score = baseScore;
    let bonusText = '';
    
    // 거리에 따른 점수 감소
    score = Math.max(0, score - (distance * 2));
    
    // 보너스 점수
    if (distance <= 2) {
        score += 2000;
        bonusText = '✨ PERFECT! +2000 ✨';
    } else if (distance <= 5) {
        score += 1000;
        bonusText = '🌟 GREAT! +1000 🌟';
    } else if (distance <= 10) {
        score += 500;
        bonusText = '⭐ GOOD! +500 ⭐';
    }
    
    // 날씨 페널티
    if (currentWeather === 'rain') {
        score = Math.floor(score * 0.8);
        bonusText += ' 🌧️ (비 -20%)';
    } else if (currentWeather === 'snow') {
        score = Math.floor(score * 0.7);
        bonusText += ' ❄️ (눈 -30%)';
    }
    
    // 점수 효과 표시
    const scoreEffect = document.getElementById('score-effect');
    scoreEffect.textContent = bonusText;
    scoreEffect.className = distance <= 2 ? 'score-perfect' : 'score-bonus';
    scoreEffect.style.left = `${carPosition}px`;
    scoreEffect.style.top = '50%';
    
    // 점수 효과 리셋
    scoreEffect.style.animation = 'none';
    scoreEffect.offsetHeight; // 리플로우 강제
    scoreEffect.style.animation = null;
    
    return score;
}

function updateScore(score) {
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const currentBestScore = parseInt(localStorage.getItem('bestScore')) || 0;
    
    scoreElement.textContent = score;
    
    if (score > currentBestScore) {
        localStorage.setItem('bestScore', score);
        bestScoreElement.textContent = score;
        bestScoreElement.classList.add('pop');
        setTimeout(() => bestScoreElement.classList.remove('pop'), 300);
    }
} 