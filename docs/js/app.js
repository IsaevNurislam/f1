// F1 Race Replay Web Application
class RaceReplay {
    constructor() {
        this.canvas = document.getElementById('trackCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.data = null;
        this.currentFrame = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        this.selectedDriver = null;
        this.lastFrameTime = 0;
        
        this.init();
    }

    async init() {
        try {
            const response = await fetch('data/race_data.json');
            this.data = await response.json();
            document.getElementById('loading').style.display = 'none';
            
            this.setupCanvas();
            this.setupEventListeners();
            this.updateEventInfo();
            this.render();
        } catch (error) {
            console.error('Error loading race data:', error);
            document.getElementById('loading').textContent = 'Error loading data. Please refresh.';
        }
    }

    setupCanvas() {
        // Calculate track bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        this.data.track.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });
        
        const padding = 50;
        const trackWidth = maxX - minX;
        const trackHeight = maxY - minY;
        
        // Set canvas size (maintain aspect ratio)
        const maxWidth = 900;
        const maxHeight = 700;
        const scale = Math.min(maxWidth / trackWidth, maxHeight / trackHeight);
        
        this.canvas.width = trackWidth * scale + padding * 2;
        this.canvas.height = trackHeight * scale + padding * 2;
        
        this.trackBounds = { minX, maxX, minY, maxY };
        this.scale = scale;
        this.padding = padding;
    }

    setupEventListeners() {
        document.getElementById('btn-play').addEventListener('click', () => this.play());
        document.getElementById('btn-pause').addEventListener('click', () => this.pause());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        
        document.getElementById('btn-slower').addEventListener('click', () => this.setSpeed(0.5));
        document.getElementById('btn-normal').addEventListener('click', () => this.setSpeed(1.0));
        document.getElementById('btn-faster').addEventListener('click', () => this.setSpeed(2.0));
        document.getElementById('btn-fastest').addEventListener('click', () => this.setSpeed(4.0));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.isPlaying ? this.pause() : this.play();
            } else if (e.code === 'ArrowRight') {
                this.currentFrame = Math.min(this.currentFrame + 50, this.data.frames.length - 1);
                this.render();
            } else if (e.code === 'ArrowLeft') {
                this.currentFrame = Math.max(this.currentFrame - 50, 0);
                this.render();
            }
        });
    }

    updateEventInfo() {
        const event = this.data.event;
        document.getElementById('event-info').textContent = 
            `${event.year} ${event.name} - Round ${event.round}`;
    }

    play() {
        this.isPlaying = true;
        document.getElementById('btn-play').style.display = 'none';
        document.getElementById('btn-pause').style.display = 'block';
        this.lastFrameTime = performance.now();
        requestAnimationFrame((time) => this.animate(time));
    }

    pause() {
        this.isPlaying = false;
        document.getElementById('btn-play').style.display = 'block';
        document.getElementById('btn-pause').style.display = 'none';
    }

    restart() {
        this.currentFrame = 0;
        this.pause();
        this.render();
    }

    setSpeed(speed) {
        this.playbackSpeed = speed;
        document.getElementById('playback-speed').textContent = `${speed}x`;
    }

    animate(currentTime) {
        if (!this.isPlaying) return;
        
        const deltaTime = currentTime - this.lastFrameTime;
        const frameIncrement = Math.floor(deltaTime / (1000 / 25) * this.playbackSpeed);
        
        if (frameIncrement > 0) {
            this.currentFrame += frameIncrement;
            this.lastFrameTime = currentTime;
            
            if (this.currentFrame >= this.data.frames.length) {
                this.currentFrame = this.data.frames.length - 1;
                this.pause();
            }
            
            this.render();
        }
        
        requestAnimationFrame((time) => this.animate(time));
    }

    render() {
        const frame = this.data.frames[this.currentFrame];
        if (!frame) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw track
        this.drawTrack();
        
        // Draw cars
        this.drawCars(frame);
        
        // Update UI
        this.updateRaceInfo(frame);
        this.updateLeaderboard(frame);
    }

    drawTrack() {
        const { minX, minY } = this.trackBounds;
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.data.track.forEach((point, i) => {
            const x = (point.x - minX) * this.scale + this.padding;
            const y = (point.y - minY) * this.scale + this.padding;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        this.ctx.stroke();
        
        // Draw track outline
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawCars(frame) {
        const { minX, minY } = this.trackBounds;
        const positions = frame.positions;
        
        Object.entries(positions).forEach(([driverCode, pos]) => {
            if (pos.x === null || pos.y === null) return;
            
            const x = (pos.x - minX) * this.scale + this.padding;
            const y = (pos.y - minY) * this.scale + this.padding;
            
            const driver = this.data.drivers[driverCode];
            if (!driver) return;
            
            const color = driver.color || '#FFFFFF';
            const isSelected = this.selectedDriver === driverCode;
            
            // Draw car circle
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, isSelected ? 8 : 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw outline for selected
            if (isSelected) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // Draw driver abbreviation
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(driver.abbreviation, x, y);
        });
    }

    updateRaceInfo(frame) {
        const totalLaps = Math.max(...this.data.frames.map(f => f.lap));
        document.getElementById('current-lap').textContent = `${frame.lap} / ${totalLaps}`;
        
        const seconds = Math.floor(frame.time);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        document.getElementById('race-time').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateLeaderboard(frame) {
        const positions = frame.positions;
        const sorted = Object.entries(positions)
            .sort((a, b) => a[1].position - b[1].position);
        
        const leaderboardHtml = sorted.map(([driverCode, pos]) => {
            const driver = this.data.drivers[driverCode];
            if (!driver) return '';
            
            const tyreClass = this.getTyreClass(pos.tyre);
            const tyreName = this.getTyreName(pos.tyre);
            const isSelected = this.selectedDriver === driverCode;
            
            return `
                <div class="driver-row ${isSelected ? 'selected' : ''}" data-driver="${driverCode}">
                    <span class="position">${pos.position}</span>
                    <div class="driver-color" style="background: ${driver.color}"></div>
                    <span class="driver-name">${driver.abbreviation}</span>
                    <div class="tyre-indicator ${tyreClass}">${tyreName}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('leaderboard-list').innerHTML = leaderboardHtml;
        
        // Add click handlers
        document.querySelectorAll('.driver-row').forEach(row => {
            row.addEventListener('click', () => {
                const driverCode = row.dataset.driver;
                this.selectDriver(driverCode);
            });
        });
    }

    getTyreClass(tyreCode) {
        const tyreMap = {
            0: 'tyre-soft',
            1: 'tyre-medium',
            2: 'tyre-hard',
            3: 'tyre-inter',
            4: 'tyre-wet'
        };
        return tyreMap[tyreCode] || 'tyre-soft';
    }

    getTyreName(tyreCode) {
        const tyreMap = {
            0: 'S',
            1: 'M',
            2: 'H',
            3: 'I',
            4: 'W'
        };
        return tyreMap[tyreCode] || '?';
    }

    selectDriver(driverCode) {
        if (this.selectedDriver === driverCode) {
            this.selectedDriver = null;
            document.getElementById('driver-details').style.display = 'none';
        } else {
            this.selectedDriver = driverCode;
            this.updateDriverDetails(driverCode);
            document.getElementById('driver-details').style.display = 'block';
        }
        this.render();
    }

    updateDriverDetails(driverCode) {
        const driver = this.data.drivers[driverCode];
        const frame = this.data.frames[this.currentFrame];
        const pos = frame.positions[driverCode];
        
        if (!driver || !pos) return;
        
        const html = `
            <div><strong>${driver.full_name}</strong></div>
            <div>Team: ${driver.team}</div>
            <div>Position: P${pos.position}</div>
            <div>Lap: ${pos.lap}</div>
            <div>Speed: ${pos.speed.toFixed(0)} km/h</div>
            <div>Gear: ${pos.gear}</div>
            <div>DRS: ${pos.drs ? 'Active' : 'Inactive'}</div>
            <div>Tyre: ${this.getTyreName(pos.tyre)}</div>
        `;
        
        document.getElementById('driver-info').innerHTML = html;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RaceReplay();
});
