class WorkoutTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.totalTime = 0;
        this.interval = null;
        this.workoutHistory = [];
        this.exercises = [];
        this.savedWorkouts = {};
        this.currentExerciseIndex = 0;
        this.currentGroupIndex = 0;
        this.currentRepeat = 1;
        this.totalRepeats = 1;
        this.isFullscreen = false;
        this.soundEnabled = true;
        
        this.initializeElements();
        this.initializeAudio();
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateDisplay();
        this.renderHistory();
        this.renderExerciseList();
        this.updateWorkoutSelector();
    }

    initializeElements() {
        // Exercise builder elements
        this.addExerciseBtn = document.getElementById('addExerciseBtn');
        this.addRestBtn = document.getElementById('addRestBtn');
        this.addGroupBtn = document.getElementById('addGroupBtn');
        this.saveWorkoutBtn = document.getElementById('saveWorkoutBtn');
        this.startWorkoutBtn = document.getElementById('startWorkoutBtn');
        this.exerciseList = document.getElementById('exerciseList');
        this.workoutSelector = document.getElementById('workoutSelector');
        this.loadWorkoutBtn = document.getElementById('loadWorkoutBtn');
        this.deleteWorkoutBtn = document.getElementById('deleteWorkoutBtn');
        
        // History elements
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        
        // Fullscreen elements
        this.fullscreenTimer = document.getElementById('fullscreenTimer');
        this.fullscreenTime = document.getElementById('fullscreenTime');
        this.fullscreenProgress = document.getElementById('fullscreenProgress');
        this.fullscreenPauseBtn = document.getElementById('fullscreenPauseBtn');
        this.fullscreenSkipBtn = document.getElementById('fullscreenSkipBtn');
        this.fullscreenStopBtn = document.getElementById('fullscreenStopBtn');
    }

    initializeAudio() {
        // Create audio elements for sounds
        this.tickSound = new Audio();
        this.bellSound = new Audio();
        
        // Generate simple tick sound (high-pitched beep)
        this.createTickSound();
        this.createBellSound();
        
        // Set volume levels
        this.tickSound.volume = 0.3;
        this.bellSound.volume = 0.5;
    }

    createTickSound() {
        // Create a realistic clock tick-tock sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a more complex tick sound with harmonics
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Main frequency (tick sound)
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator1.type = 'sawtooth';
        
        // Harmonic frequency
        oscillator2.frequency.setValueAtTime(2400, audioContext.currentTime);
        oscillator2.type = 'sine';
        
        // Filter to make it sound more mechanical
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);
        filter.Q.setValueAtTime(2, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.05);
        oscillator2.stop(audioContext.currentTime + 0.05);
        
        // Store the audio context for reuse
        this.audioContext = audioContext;
    }

    createBellSound() {
        // Create a boxing ring bell sound using Web Audio API
        const audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a metallic bell sound with multiple oscillators
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        oscillator3.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Main bell frequency
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.type = 'triangle';
        
        // Harmonic frequencies for metallic sound
        oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator2.type = 'sine';
        
        oscillator3.frequency.setValueAtTime(1600, audioContext.currentTime);
        oscillator3.type = 'sine';
        
        // Filter for metallic resonance
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, audioContext.currentTime);
        filter.Q.setValueAtTime(8, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator3.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 1.0);
        oscillator2.stop(audioContext.currentTime + 1.0);
        oscillator3.stop(audioContext.currentTime + 1.0);
    }

    playTickSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Create a realistic clock tick-tock sound
            const audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a more complex tick sound with harmonics
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Main frequency (tick sound)
            oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator1.type = 'sawtooth';
            
            // Harmonic frequency
            oscillator2.frequency.setValueAtTime(2400, audioContext.currentTime);
            oscillator2.type = 'sine';
            
            // Filter to make it sound more mechanical
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, audioContext.currentTime);
            filter.Q.setValueAtTime(2, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.05);
            oscillator2.stop(audioContext.currentTime + 0.05);
        } catch (error) {
            console.log('Tick sound not available:', error);
        }
    }

    playBellSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Play boxing ring bell sound
            const audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a metallic bell sound with multiple oscillators
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const oscillator3 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            oscillator3.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Main bell frequency
            oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator1.type = 'triangle';
            
            // Harmonic frequencies for metallic sound
            oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator2.type = 'sine';
            
            oscillator3.frequency.setValueAtTime(1600, audioContext.currentTime);
            oscillator3.type = 'sine';
            
            // Filter for metallic resonance
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, audioContext.currentTime);
            filter.Q.setValueAtTime(8, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
            
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator3.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 1.0);
            oscillator2.stop(audioContext.currentTime + 1.0);
            oscillator3.stop(audioContext.currentTime + 1.0);
        } catch (error) {
            console.log('Bell sound not available:', error);
        }
    }

    playWarningSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Create a warning sound (higher pitch beep)
            const audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Higher frequency for warning
            oscillator1.frequency.setValueAtTime(1500, audioContext.currentTime);
            oscillator1.type = 'sawtooth';
            
            oscillator2.frequency.setValueAtTime(2000, audioContext.currentTime);
            oscillator2.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.2);
            oscillator2.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Warning sound not available:', error);
        }
    }

    setupEventListeners() {
        // Exercise builder
        this.addExerciseBtn.addEventListener('click', () => this.addExercise());
        this.addRestBtn.addEventListener('click', () => this.addRest());
        this.addGroupBtn.addEventListener('click', () => this.addGroup());
        this.saveWorkoutBtn.addEventListener('click', () => this.saveWorkout());
        this.startWorkoutBtn.addEventListener('click', () => this.startTimer());
        this.loadWorkoutBtn.addEventListener('click', () => this.loadWorkout());
        this.deleteWorkoutBtn.addEventListener('click', () => this.deleteWorkout());
        
        // History
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Fullscreen controls
        this.fullscreenPauseBtn.addEventListener('click', () => this.pauseTimer());
        this.fullscreenSkipBtn.addEventListener('click', () => this.skipExercise());
        this.fullscreenStopBtn.addEventListener('click', () => this.stopTimer());
    }



    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startWorkoutBtn.disabled = true;
            
            // Check if there are exercises to run
            if (this.exercises.length === 0) {
                alert('Please add some exercises before starting the timer!');
                this.isRunning = false;
                this.startWorkoutBtn.disabled = false;
                return;
            }
            
            if (this.currentTime === 0) {
                this.currentExerciseIndex = 0;
                this.currentGroupIndex = 0;
                this.currentRepeat = 1;
                this.currentTime = this.exercises[0].duration;
                this.totalTime = this.calculateTotalTime();
                this.showFullscreenTimer();
                this.showGetReadyScreen();
                return; // Don't start the main timer yet
            }
            
            this.interval = setInterval(() => this.updateTimer(), 1000);
            this.updateDisplay();
        }
    }

    pauseTimer() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            clearInterval(this.interval);
            this.fullscreenPauseBtn.textContent = 'Start';
        } else if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.fullscreenPauseBtn.textContent = 'Pause';
            this.interval = setInterval(() => this.updateTimer(), 1000);
        }
    }

    stopTimer() {
        // Clear any running intervals
        if (this.getReadyInterval) {
            clearInterval(this.getReadyInterval);
            this.getReadyInterval = null;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.resetTimer();
        this.hideFullscreenTimer();
    }

    skipExercise() {
        if (this.isRunning) {
            this.handleExerciseComplete();
        }
    }

    showGetReadyScreen() {
        this.fullscreenTime.textContent = '5';
        this.fullscreenProgress.textContent = 'Get Ready...';
        this.fullscreenTimer.className = 'fullscreen-timer active get-ready';
        
        // Disable Pause and Skip buttons during countdown
        this.fullscreenPauseBtn.disabled = true;
        this.fullscreenSkipBtn.disabled = true;
        
        let countdown = 5;
        this.getReadyInterval = setInterval(() => {
            countdown--;
            this.fullscreenTime.textContent = countdown.toString();
            
            if (countdown <= 0) {
                clearInterval(this.getReadyInterval);
                this.fullscreenTimer.classList.remove('get-ready');
                // Start the main timer after countdown
                this.interval = setInterval(() => this.updateTimer(), 1000);
                this.updateDisplay();
                
                // Enable Pause and Skip buttons once workout starts
                this.fullscreenPauseBtn.disabled = false;
                this.fullscreenSkipBtn.disabled = false;
            }
        }, 1000);
    }

    showWellDoneScreen() {
        this.fullscreenTime.textContent = 'Well Done!';
        this.fullscreenProgress.textContent = 'Workout Complete!';
        this.fullscreenTimer.className = 'fullscreen-timer active well-done';
        
        // Disable Pause and Skip buttons during completion screen
        this.fullscreenPauseBtn.disabled = true;
        this.fullscreenSkipBtn.disabled = true;
        
        // Hide fullscreen after 3 seconds
        setTimeout(() => {
            this.hideFullscreenTimer();
            this.resetTimer();
        }, 3000);
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.currentExerciseIndex = 0;
        this.currentGroupIndex = 0;
        this.currentRepeat = 1;
        
        // Clear all intervals
        if (this.getReadyInterval) {
            clearInterval(this.getReadyInterval);
            this.getReadyInterval = null;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.startWorkoutBtn.disabled = false;
        
        this.updateDisplay();
    }

    updateTimer() {
        // Ensure currentTime is a valid number
        if (typeof this.currentTime !== 'number' || isNaN(this.currentTime)) {
            this.currentTime = 0;
        }
        
        this.currentTime--;
        
        // Play tick sound every second
        this.playTickSound();
        
        // Play warning sound at 10 seconds remaining
        if (this.currentTime === 10) {
            this.playWarningSound();
        }
        
        if (this.currentTime <= 0) {
            this.handleExerciseComplete();
        }
        
        this.updateDisplay();
    }

    handleExerciseComplete() {
        // Play bell sound when exercise is finished
        this.playBellSound();
        
        this.currentExerciseIndex++;
        
        if (this.currentExerciseIndex >= this.exercises.length) {
            // Workout complete
            this.completeWorkout();
            return;
        } else {
            if (this.exercises[this.currentExerciseIndex]) {
                this.currentTime = this.exercises[this.currentExerciseIndex].duration;
            } else {
                this.completeWorkout();
                return;
            }
        }
        
        this.updateDisplay();
    }

    completeWorkout() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.isPaused = false;
        
        this.startWorkoutBtn.disabled = false;
        
        // Add to history
        this.addToHistory();
        
        // Show "Well Done!" screen
        this.showWellDoneScreen();
    }

    calculateTotalTime() {
        let total = 0;
        for (let exercise of this.exercises) {
            total += exercise.duration;
        }
        return total;
    }

    getProgressWithNextExercise() {
        const currentExercise = this.exercises[this.currentExerciseIndex];
        const nextExerciseIndex = this.currentExerciseIndex + 1;
        
        let progress = `Exercise ${this.currentExerciseIndex + 1} of ${this.exercises.length}`;
        
        // Add current exercise info
        if (currentExercise) {
            const currentMinutes = Math.floor(currentExercise.duration / 60);
            const currentSeconds = currentExercise.duration % 60;
            const currentTimeString = `${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')}`;
            
            progress += ` • ${currentExercise.name} (${currentTimeString})`;
        }
        
        // Add next exercise info if available
        if (nextExerciseIndex < this.exercises.length) {
            const nextExercise = this.exercises[nextExerciseIndex];
            if (nextExercise) {
                const nextMinutes = Math.floor(nextExercise.duration / 60);
                const nextSeconds = nextExercise.duration % 60;
                const nextTimeString = `${nextMinutes.toString().padStart(2, '0')}:${nextSeconds.toString().padStart(2, '0')}`;
                
                progress += `\nNext: ${nextExercise.name} (${nextTimeString})`;
            }
        } else {
            progress += '\nNext: Workout Complete!';
        }
        
        return progress;
    }

    updateDisplay() {
        // Ensure currentTime is a valid number
        const time = Math.max(0, this.currentTime || 0);
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.fullscreenTime.textContent = timeString;
        
        if (this.isRunning && this.exercises.length > 0 && this.currentExerciseIndex < this.exercises.length) {
            const currentExercise = this.exercises[this.currentExerciseIndex];
            if (currentExercise) {
                // Update fullscreen background based on exercise type and time
                this.updateFullscreenBackground(currentExercise, time);
                
                // Update progress with next exercise info
                const progress = this.getProgressWithNextExercise();
                this.fullscreenProgress.textContent = progress;
            }
        }
    }

    updateFullscreenBackground(exercise, timeLeft) {
        this.fullscreenTimer.className = 'fullscreen-timer active';
        
        if (exercise.type === 'rest') {
            this.fullscreenTimer.classList.add('rest');
            this.fullscreenTimer.classList.remove('workout', 'warning');
        } else {
            this.fullscreenTimer.classList.add('workout');
            this.fullscreenTimer.classList.remove('rest');
            
            // Last 10 seconds warning
            if (timeLeft <= 10) {
                this.fullscreenTimer.classList.add('warning');
            } else {
                this.fullscreenTimer.classList.remove('warning');
            }
        }
    }

    showFullscreenTimer() {
        this.isFullscreen = true;
        this.fullscreenTimer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideFullscreenTimer() {
        this.isFullscreen = false;
        this.fullscreenTimer.classList.remove('active');
        document.body.style.overflow = '';
    }

    addExercise() {
        const name = prompt('Enter exercise name:');
        if (!name) return;
        
        const duration = parseInt(prompt('Enter duration in minutes:'));
        if (!duration || duration <= 0) return;
        
        this.exercises.push({
            type: 'exercise',
            name: name,
            duration: duration * 60
        });
        
        this.renderExerciseList();
        this.saveToLocalStorage();
    }

    addRest() {
        const duration = parseInt(prompt('Enter rest duration in minutes:'));
        if (!duration || duration <= 0) return;
        
        this.exercises.push({
            type: 'rest',
            name: 'Rest',
            duration: duration * 60
        });
        
        this.renderExerciseList();
        this.saveToLocalStorage();
    }

    addGroup() {
        const groupName = prompt('Enter group name:');
        if (!groupName) return;
        
        const repeats = parseInt(prompt('Enter number of repeats:'));
        if (!repeats || repeats <= 0) return;
        
        const groupExercises = [];
        let addMore = true;
        
        while (addMore) {
            const exerciseName = prompt('Enter exercise name (or cancel to finish):');
            if (!exerciseName) break;
            
            const duration = parseInt(prompt('Enter duration in minutes:'));
            if (!duration || duration <= 0) continue;
            
            groupExercises.push({
                type: 'exercise',
                name: exerciseName,
                duration: duration * 60
            });
            
            const addRest = confirm('Add rest after this exercise?');
            if (addRest) {
                const restDuration = parseInt(prompt('Enter rest duration in minutes:'));
                if (restDuration && restDuration > 0) {
                    groupExercises.push({
                        type: 'rest',
                        name: 'Rest',
                        duration: restDuration * 60
                    });
                }
            }
        }
        
        if (groupExercises.length > 0) {
            // Add the group exercises directly to the main exercise list
            for (let repeat = 0; repeat < repeats; repeat++) {
                groupExercises.forEach(exercise => {
                    this.exercises.push({
                        ...exercise,
                        groupName: groupName,
                        repeatNumber: repeat + 1,
                        totalRepeats: repeats
                    });
                });
            }
            
            this.renderExerciseList();
            this.saveToLocalStorage();
        }
    }

    renderExerciseList() {
        if (this.exercises.length === 0) {
            this.exerciseList.innerHTML = '<div class="empty-history">No exercises added yet. Add some exercises to get started!</div>';
            return;
        }
        
        let html = '';
        let currentGroup = null;
        
        for (let i = 0; i < this.exercises.length; i++) {
            const exercise = this.exercises[i];
            
            // Check if this is a new group
            if (exercise.groupName && exercise.groupName !== currentGroup) {
                currentGroup = exercise.groupName;
                html += `
                    <div class="exercise-item group group-header">
                        <div class="exercise-info">
                            <div class="exercise-name">${exercise.groupName} (${exercise.totalRepeats} repeats)</div>
                            <div class="exercise-duration">Group ${exercise.repeatNumber}/${exercise.totalRepeats}</div>
                        </div>
                    </div>
                `;
            }
            
            // Show group indicator if this exercise is part of a group
            const groupIndicator = exercise.groupName ? 
                `<div class="exercise-group-indicator">${exercise.groupName} - Round ${exercise.repeatNumber}</div>` : '';
            
            html += `
                <div class="exercise-item ${exercise.type} ${exercise.groupName ? 'group-item' : ''}">
                    <div class="exercise-info">
                        <div class="exercise-name">${exercise.name} ${groupIndicator}</div>
                        <div class="exercise-duration">${this.formatDuration(exercise.duration)}</div>
                    </div>
                    <div class="exercise-controls">
                        <button class="edit-btn" onclick="timer.editExercise(${i})">Edit</button>
                        <button class="delete-btn" onclick="timer.deleteExercise(${i})">Delete</button>
                        ${i > 0 ? `<button class="move-up-btn" onclick="timer.moveExercise(${i}, -1)">↑</button>` : ''}
                        ${i < this.exercises.length - 1 ? `<button class="move-down-btn" onclick="timer.moveExercise(${i}, 1)">↓</button>` : ''}
                    </div>
                </div>
            `;
        }
        
        this.exerciseList.innerHTML = html;
    }

    editExercise(index) {
        const exercise = this.exercises[index];
        
        const newName = prompt('Enter new name:', exercise.name);
        if (!newName) return;
        
        const newDuration = parseInt(prompt('Enter new duration in minutes:', Math.floor(exercise.duration / 60)));
        if (!newDuration || newDuration <= 0) return;
        
        exercise.name = newName;
        exercise.duration = newDuration * 60;
        
        this.renderExerciseList();
        this.saveToLocalStorage();
    }

    deleteExercise(index) {
        if (confirm('Are you sure you want to delete this exercise?')) {
            this.exercises.splice(index, 1);
            this.renderExerciseList();
            this.saveToLocalStorage();
        }
    }

    moveExercise(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.exercises.length) {
            const temp = this.exercises[index];
            this.exercises[index] = this.exercises[newIndex];
            this.exercises[newIndex] = temp;
            this.renderExerciseList();
            this.saveToLocalStorage();
        }
    }

    saveWorkout() {
        const name = prompt('Enter workout name:');
        if (!name) return;
        
        this.savedWorkouts[name] = {
            exercises: JSON.parse(JSON.stringify(this.exercises)),
            date: new Date().toISOString()
        };
        
        this.saveToLocalStorage();
        this.updateWorkoutSelector();
        alert('Workout saved successfully!');
    }

    loadWorkout() {
        const selectedWorkout = this.workoutSelector.value;
        if (!selectedWorkout) return;
        
        const workout = this.savedWorkouts[selectedWorkout];
        if (workout) {
            this.exercises = JSON.parse(JSON.stringify(workout.exercises));
            this.renderExerciseList();
            this.saveToLocalStorage();
            alert('Workout loaded successfully!');
        }
    }

    deleteWorkout() {
        const selectedWorkout = this.workoutSelector.value;
        if (!selectedWorkout) return;
        
        if (confirm('Are you sure you want to delete this workout?')) {
            delete this.savedWorkouts[selectedWorkout];
            this.saveToLocalStorage();
            this.updateWorkoutSelector();
        }
    }

    updateWorkoutSelector() {
        const options = ['<option value="">Select a workout...</option>'];
        
        for (let name in this.savedWorkouts) {
            const workout = this.savedWorkouts[name];
            const date = new Date(workout.date).toLocaleDateString();
            options.push(`<option value="${name}">${name} (${date})</option>`);
        }
        
        this.workoutSelector.innerHTML = options.join('');
    }

    addToHistory() {
        const workout = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            duration: this.formatDuration(this.totalTime),
            exercises: this.exercises.length,
            totalTime: this.totalTime
        };
        
        this.workoutHistory.unshift(workout);
        
        // Keep only last 20 workouts
        if (this.workoutHistory.length > 20) {
            this.workoutHistory = this.workoutHistory.slice(0, 20);
        }
        
        this.saveToLocalStorage();
        this.renderHistory();
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    renderHistory() {
        if (this.workoutHistory.length === 0) {
            this.historyList.innerHTML = '<div class="empty-history">No workout history yet. Start your first workout!</div>';
            return;
        }
        
        this.historyList.innerHTML = this.workoutHistory.map(workout => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-date">${workout.date} at ${workout.time}</div>
                    <div class="history-duration">
                        ${workout.duration} • ${workout.exercises} exercises
                    </div>
                </div>
                <button class="history-delete" onclick="timer.deleteFromHistory(${workout.id})">×</button>
            </div>
        `).join('');
    }

    deleteFromHistory(id) {
        this.workoutHistory = this.workoutHistory.filter(workout => workout.id !== id);
        this.saveToLocalStorage();
        this.renderHistory();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all workout history?')) {
            this.workoutHistory = [];
            this.saveToLocalStorage();
            this.renderHistory();
        }
    }

    saveToLocalStorage() {
        const data = {
            workoutHistory: this.workoutHistory,
            exercises: this.exercises,
            savedWorkouts: this.savedWorkouts
        };
        localStorage.setItem('workoutTimer', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('workoutTimer');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.workoutHistory = data.workoutHistory || [];
                this.exercises = data.exercises || [];
                this.savedWorkouts = data.savedWorkouts || {};
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }
}

// Initialize the timer when the page loads
let timer;
document.addEventListener('DOMContentLoaded', () => {
    timer = new WorkoutTimer();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!timer) return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            if (timer.isRunning && !timer.isPaused) {
                timer.pauseTimer();
            } else if (timer.isRunning && timer.isPaused) {
                timer.pauseTimer(); // This will resume
            } else if (!timer.isRunning) {
                timer.startTimer();
            }
            break;
        case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                timer.resetTimer();
            }
            break;
        case 'Escape':
            if (timer.isFullscreen) {
                timer.stopTimer();
            }
            break;
    }
});
