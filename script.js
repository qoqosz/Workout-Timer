const STORAGE_KEY = "pulseforge-workout-v1";
const STORAGE_SCHEMA_VERSION = 1;

function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampInt(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, number));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createGroupItem(overrides = {}) {
    return {
        id: uid("item"),
        name: "Exercise",
        duration: 30,
        repeats: 1,
        ...overrides
    };
}

function createExercise(overrides = {}) {
    return {
        id: uid("step"),
        type: "exercise",
        name: "Exercise",
        duration: 30,
        repeats: 1,
        ...overrides
    };
}

function createGroup(overrides = {}) {
    return {
        id: uid("group"),
        type: "group",
        name: "Group",
        repeats: 2,
        items: [
            createGroupItem({ name: "Work", duration: 40, repeats: 1 }),
            createGroupItem({ name: "Rest", duration: 20, repeats: 1 })
        ],
        ...overrides
    };
}

function buildDefaultWorkout() {
    return {
        name: "My Workout",
        countdown: 5,
        steps: [
            createExercise({ name: "Jump Rope", duration: 45, repeats: 2 }),
            createGroup({
                name: "Upper Body Circuit",
                repeats: 2,
                items: [
                    createGroupItem({ name: "Push-ups", duration: 40, repeats: 1 }),
                    createGroupItem({ name: "Rest", duration: 20, repeats: 1 }),
                    createGroupItem({ name: "Plank", duration: 30, repeats: 1 })
                ]
            })
        ]
    };
}

class WorkoutApp {
    constructor() {
        this.workout = this.loadWorkout();
        this.runner = this.createRunnerState();
        this.audioContext = null;
        this.soundEnabled = true;

        this.workoutNameInput = document.getElementById("workoutName");
        this.countdownInput = document.getElementById("countdownInput");
        this.addExerciseBtn = document.getElementById("addExerciseBtn");
        this.addRestBtn = document.getElementById("addRestBtn");
        this.addGroupBtn = document.getElementById("addGroupBtn");
        this.clearWorkoutBtn = document.getElementById("clearWorkoutBtn");
        this.startWorkoutBtn = document.getElementById("startWorkoutBtn");
        this.exportBtn = document.getElementById("exportBtn");
        this.importBtn = document.getElementById("importBtn");
        this.importInput = document.getElementById("importInput");

        this.planSummary = document.getElementById("planSummary");
        this.stepsContainer = document.getElementById("stepsContainer");

        this.runnerOverlay = document.getElementById("runnerOverlay");
        this.runnerStage = document.getElementById("runnerStage");
        this.runnerExerciseName = document.getElementById("runnerExerciseName");
        this.runnerExerciseMeta = document.getElementById("runnerExerciseMeta");
        this.runnerTimer = document.getElementById("runnerTimer");
        this.stepProgressText = document.getElementById("stepProgressText");
        this.stepProgressBar = document.getElementById("stepProgressBar");
        this.totalProgressText = document.getElementById("totalProgressText");
        this.totalProgressBar = document.getElementById("totalProgressBar");

        this.pauseResumeBtn = document.getElementById("pauseResumeBtn");
        this.skipBtn = document.getElementById("skipBtn");
        this.stopBtn = document.getElementById("stopBtn");
        this.soundToggleBtn = document.getElementById("soundToggleBtn");

        this.toastContainer = document.getElementById("toastContainer");

        this.bindEvents();
        this.render();
        this.updateSoundToggleUI();
    }

    createRunnerState() {
        return {
            status: "idle",
            sequence: [],
            index: 0,
            countdownRemaining: 0,
            stepRemaining: 0,
            totalRemaining: 0,
            totalDuration: 0,
            timerId: null
        };
    }

    bindEvents() {
        this.addExerciseBtn.addEventListener("click", () => {
            this.ensureAudioContext();
            this.workout.steps.push(createExercise());
            this.commitAndRender();
        });

        this.addRestBtn.addEventListener("click", () => {
            this.ensureAudioContext();
            this.workout.steps.push(createExercise({ name: "Rest", duration: 20, repeats: 1 }));
            this.commitAndRender();
        });

        this.addGroupBtn.addEventListener("click", () => {
            this.ensureAudioContext();
            this.workout.steps.push(createGroup());
            this.commitAndRender();
        });

        this.clearWorkoutBtn.addEventListener("click", () => {
            if (!window.confirm("Clear the current workout plan?")) {
                return;
            }
            this.workout.steps = [];
            this.commitAndRender();
        });

        this.workoutNameInput.addEventListener("input", (event) => {
            this.workout.name = this.sanitizeName(event.target.value, "My Workout", 80);
            this.persistWorkout();
        });

        this.countdownInput.addEventListener("change", (event) => {
            this.workout.countdown = clampInt(event.target.value, 0, 30, 5);
            event.target.value = String(this.workout.countdown);
            this.persistWorkout();
        });

        this.stepsContainer.addEventListener("click", (event) => this.handleStepAction(event));
        this.stepsContainer.addEventListener("input", (event) => this.handleStepInput(event));
        this.stepsContainer.addEventListener("change", (event) => this.handleStepChange(event));

        this.startWorkoutBtn.addEventListener("click", () => this.startWorkout());

        this.exportBtn.addEventListener("click", () => this.exportWorkout());
        this.importBtn.addEventListener("click", () => this.importInput.click());
        this.importInput.addEventListener("change", (event) => this.importWorkout(event));

        this.pauseResumeBtn.addEventListener("click", () => this.togglePauseResume());
        this.skipBtn.addEventListener("click", () => this.skipCurrent());
        this.stopBtn.addEventListener("click", () => this.stopWorkout());
        this.soundToggleBtn.addEventListener("click", () => this.toggleSound());

        document.addEventListener("keydown", (event) => {
            if (!this.runnerOverlay.classList.contains("active")) {
                return;
            }

            if (event.code === "Space") {
                event.preventDefault();
                this.togglePauseResume();
            }

            if (event.code === "ArrowRight") {
                event.preventDefault();
                this.skipCurrent();
            }

            if (event.code === "Escape") {
                event.preventDefault();
                this.stopWorkout();
            }
        });
    }

    ensureAudioContext() {
        if (this.audioContext) {
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume().catch(() => {});
            }
            return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return;
        }

        try {
            this.audioContext = new AudioCtx();
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume().catch(() => {});
            }
        } catch (error) {
            this.audioContext = null;
        }
    }

    playTick() {
        if (!this.audioContext || !this.soundEnabled) {
            return;
        }

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(1200, now);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.055);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.updateSoundToggleUI();
    }

    updateSoundToggleUI() {
        if (!this.soundToggleBtn) {
            return;
        }

        this.soundToggleBtn.textContent = this.soundEnabled ? "🔊" : "🔇";
        this.soundToggleBtn.setAttribute("aria-pressed", this.soundEnabled ? "true" : "false");
        this.soundToggleBtn.title = this.soundEnabled ? "Sound on" : "Sound off";
    }

    handleStepAction(event) {
        const button = event.target.closest("[data-action]");
        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const stepId = button.dataset.stepId;
        const groupId = button.dataset.groupId;
        const itemId = button.dataset.itemId;

        if (action === "step-delete") {
            this.deleteTopLevelStep(stepId);
            return;
        }

        if (action === "step-duplicate") {
            this.duplicateTopLevelStep(stepId);
            return;
        }

        if (action === "step-up" || action === "step-down") {
            this.moveTopLevelStep(stepId, action === "step-up" ? -1 : 1);
            return;
        }

        if (action === "group-add-item") {
            const group = this.findGroup(groupId);
            if (!group) {
                return;
            }
            group.items.push(createGroupItem());
            this.commitAndRender();
            return;
        }

        if (action === "group-add-rest") {
            const group = this.findGroup(groupId);
            if (!group) {
                return;
            }
            group.items.push(createGroupItem({ name: "Rest", duration: 20, repeats: 1 }));
            this.commitAndRender();
            return;
        }

        if (action === "group-item-delete") {
            this.deleteGroupItem(groupId, itemId);
            return;
        }

        if (action === "group-item-up" || action === "group-item-down") {
            this.moveGroupItem(groupId, itemId, action === "group-item-up" ? -1 : 1);
        }
    }

    handleStepInput(event) {
        const target = event.target;
        const bind = target.dataset.bind;
        if (!bind) {
            return;
        }

        const isTextField = bind === "step-name" || bind === "group-name" || bind === "group-item-name";
        if (!isTextField) {
            return;
        }

        this.applyBinding(target, { commit: false });
        this.persistWorkout();
    }

    handleStepChange(event) {
        const target = event.target;
        const bind = target.dataset.bind;
        if (!bind) {
            return;
        }

        this.applyBinding(target, { commit: true });
        this.persistWorkout();
        this.renderSummary();
    }

    applyBinding(target, options = { commit: true }) {
        const bind = target.dataset.bind;
        const stepId = target.dataset.stepId;
        const groupId = target.dataset.groupId;
        const itemId = target.dataset.itemId;

        if (bind === "step-name") {
            const step = this.findStep(stepId);
            if (step && step.type === "exercise") {
                step.name = this.sanitizeName(target.value, "Exercise", 60);
            }
            return;
        }

        if (bind === "step-duration") {
            const step = this.findStep(stepId);
            if (step && step.type === "exercise") {
                step.duration = clampInt(target.value, 1, 3600, step.duration);
                if (options.commit) {
                    target.value = String(step.duration);
                }
            }
            return;
        }

        if (bind === "step-repeats") {
            const step = this.findStep(stepId);
            if (step && step.type === "exercise") {
                step.repeats = clampInt(target.value, 1, 20, step.repeats);
                if (options.commit) {
                    target.value = String(step.repeats);
                }
            }
            return;
        }

        if (bind === "group-name") {
            const group = this.findGroup(groupId);
            if (group) {
                group.name = this.sanitizeName(target.value, "Group", 60);
            }
            return;
        }

        if (bind === "group-repeats") {
            const group = this.findGroup(groupId);
            if (group) {
                group.repeats = clampInt(target.value, 1, 20, group.repeats);
                if (options.commit) {
                    target.value = String(group.repeats);
                }
            }
            return;
        }

        if (bind === "group-item-name") {
            const item = this.findGroupItem(groupId, itemId);
            if (item) {
                item.name = this.sanitizeName(target.value, "Exercise", 60);
            }
            return;
        }

        if (bind === "group-item-duration") {
            const item = this.findGroupItem(groupId, itemId);
            if (item) {
                item.duration = clampInt(target.value, 1, 3600, item.duration);
                if (options.commit) {
                    target.value = String(item.duration);
                }
            }
            return;
        }

        if (bind === "group-item-repeats") {
            const item = this.findGroupItem(groupId, itemId);
            if (item) {
                item.repeats = clampInt(target.value, 1, 20, item.repeats);
                if (options.commit) {
                    target.value = String(item.repeats);
                }
            }
        }
    }

    findStep(stepId) {
        return this.workout.steps.find((step) => step.id === stepId);
    }

    findStepIndex(stepId) {
        return this.workout.steps.findIndex((step) => step.id === stepId);
    }

    findGroup(groupId) {
        return this.workout.steps.find((step) => step.type === "group" && step.id === groupId);
    }

    findGroupItem(groupId, itemId) {
        const group = this.findGroup(groupId);
        if (!group) {
            return null;
        }
        return group.items.find((item) => item.id === itemId) || null;
    }

    moveTopLevelStep(stepId, direction) {
        const index = this.findStepIndex(stepId);
        if (index === -1) {
            return;
        }
        const destination = index + direction;
        if (destination < 0 || destination >= this.workout.steps.length) {
            return;
        }
        const [step] = this.workout.steps.splice(index, 1);
        this.workout.steps.splice(destination, 0, step);
        this.commitAndRender();
    }

    deleteTopLevelStep(stepId) {
        const index = this.findStepIndex(stepId);
        if (index === -1) {
            return;
        }
        this.workout.steps.splice(index, 1);
        this.commitAndRender();
    }

    duplicateTopLevelStep(stepId) {
        const index = this.findStepIndex(stepId);
        if (index === -1) {
            return;
        }
        const source = this.workout.steps[index];
        let duplicated;

        if (source.type === "group") {
            duplicated = {
                id: uid("group"),
                type: "group",
                name: source.name,
                repeats: source.repeats,
                items: source.items.map((item) => ({
                    id: uid("item"),
                    name: item.name,
                    duration: item.duration,
                    repeats: item.repeats
                }))
            };
        } else {
            duplicated = {
                id: uid("step"),
                type: "exercise",
                name: source.name,
                duration: source.duration,
                repeats: source.repeats
            };
        }

        this.workout.steps.splice(index + 1, 0, duplicated);
        this.commitAndRender();
    }

    deleteGroupItem(groupId, itemId) {
        const group = this.findGroup(groupId);
        if (!group) {
            return;
        }

        if (group.items.length <= 1) {
            this.toast("A group needs at least one exercise.", "error");
            return;
        }

        group.items = group.items.filter((item) => item.id !== itemId);
        this.commitAndRender();
    }

    moveGroupItem(groupId, itemId, direction) {
        const group = this.findGroup(groupId);
        if (!group) {
            return;
        }

        const index = group.items.findIndex((item) => item.id === itemId);
        if (index === -1) {
            return;
        }

        const destination = index + direction;
        if (destination < 0 || destination >= group.items.length) {
            return;
        }

        const [item] = group.items.splice(index, 1);
        group.items.splice(destination, 0, item);
        this.commitAndRender();
    }

    commitAndRender() {
        this.persistWorkout();
        this.render();
    }

    render() {
        this.workoutNameInput.value = this.workout.name;
        this.countdownInput.value = String(this.workout.countdown);

        if (this.workout.steps.length === 0) {
            this.stepsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No exercises yet. Add a single exercise or create a repeatable group.</p>
                </div>
            `;
        } else {
            this.stepsContainer.innerHTML = this.workout.steps.map((step) => {
                if (step.type === "group") {
                    return this.renderGroup(step);
                }
                return this.renderExercise(step);
            }).join("");
        }

        this.renderSummary();
    }

    renderSummary() {
        const sequence = this.expandWorkout();
        const totalSeconds = sequence.reduce((accumulator, item) => accumulator + item.duration, 0);
        const groupCount = this.workout.steps.filter((step) => step.type === "group").length;
        const singleCount = this.workout.steps.filter((step) => step.type === "exercise").length;

        const pills = [
            `${this.workout.steps.length} blocks`,
            `${sequence.length} intervals`,
            `${this.formatClock(totalSeconds)} total`,
            `${singleCount} single exercises`,
            `${groupCount} groups`
        ];

        this.planSummary.innerHTML = pills.map((item) => `<span class="stat-pill">${escapeHtml(item)}</span>`).join("");
        this.startWorkoutBtn.disabled = sequence.length === 0;
    }

    renderExercise(step) {
        const estimated = this.formatClock(step.duration * step.repeats);
        return `
            <article class="step-card exercise" data-step-id="${escapeHtml(step.id)}">
                <div class="step-head">
                    <span class="step-tag">Exercise</span>
                    <div class="icon-actions">
                        <button class="icon-btn" data-action="step-up" data-step-id="${escapeHtml(step.id)}" type="button">Up</button>
                        <button class="icon-btn" data-action="step-down" data-step-id="${escapeHtml(step.id)}" type="button">Down</button>
                        <button class="icon-btn" data-action="step-duplicate" data-step-id="${escapeHtml(step.id)}" type="button">Duplicate</button>
                        <button class="icon-btn" data-action="step-delete" data-step-id="${escapeHtml(step.id)}" type="button">Delete</button>
                    </div>
                </div>

                <div class="field-grid">
                    <label class="field">
                        <span>Name</span>
                        <input
                            data-bind="step-name"
                            data-step-id="${escapeHtml(step.id)}"
                            type="text"
                            maxlength="60"
                            value="${escapeHtml(step.name)}"
                        >
                    </label>
                    <label class="field">
                        <span>Seconds</span>
                        <input
                            data-bind="step-duration"
                            data-step-id="${escapeHtml(step.id)}"
                            type="number"
                            min="1"
                            max="3600"
                            step="1"
                            value="${escapeHtml(step.duration)}"
                        >
                    </label>
                    <label class="field">
                        <span>Repeats</span>
                        <input
                            data-bind="step-repeats"
                            data-step-id="${escapeHtml(step.id)}"
                            type="number"
                            min="1"
                            max="20"
                            step="1"
                            value="${escapeHtml(step.repeats)}"
                        >
                    </label>
                </div>

                <div class="helper-row">Estimated block time: ${escapeHtml(estimated)}</div>
            </article>
        `;
    }

    renderGroup(group) {
        const groupDuration = group.items.reduce((accumulator, item) => {
            return accumulator + (item.duration * item.repeats);
        }, 0) * group.repeats;

        const itemsMarkup = group.items.map((item) => `
            <div class="group-item" data-group-id="${escapeHtml(group.id)}" data-item-id="${escapeHtml(item.id)}">
                <label class="field">
                    <span>Name</span>
                    <input
                        data-bind="group-item-name"
                        data-group-id="${escapeHtml(group.id)}"
                        data-item-id="${escapeHtml(item.id)}"
                        type="text"
                        maxlength="60"
                        value="${escapeHtml(item.name)}"
                    >
                </label>
                <label class="field">
                    <span>Seconds</span>
                    <input
                        data-bind="group-item-duration"
                        data-group-id="${escapeHtml(group.id)}"
                        data-item-id="${escapeHtml(item.id)}"
                        type="number"
                        min="1"
                        max="3600"
                        step="1"
                        value="${escapeHtml(item.duration)}"
                    >
                </label>
                <label class="field">
                    <span>Repeats</span>
                    <input
                        data-bind="group-item-repeats"
                        data-group-id="${escapeHtml(group.id)}"
                        data-item-id="${escapeHtml(item.id)}"
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        value="${escapeHtml(item.repeats)}"
                    >
                </label>
                <div class="group-tools">
                    <button class="small-btn" data-action="group-item-up" data-group-id="${escapeHtml(group.id)}" data-item-id="${escapeHtml(item.id)}" type="button">Up</button>
                    <button class="small-btn" data-action="group-item-down" data-group-id="${escapeHtml(group.id)}" data-item-id="${escapeHtml(item.id)}" type="button">Down</button>
                    <button class="small-btn danger" data-action="group-item-delete" data-group-id="${escapeHtml(group.id)}" data-item-id="${escapeHtml(item.id)}" type="button">Delete</button>
                </div>
            </div>
        `).join("");

        return `
            <article class="step-card group" data-step-id="${escapeHtml(group.id)}">
                <div class="step-head">
                    <span class="step-tag">Group</span>
                    <div class="icon-actions">
                        <button class="icon-btn" data-action="step-up" data-step-id="${escapeHtml(group.id)}" type="button">Up</button>
                        <button class="icon-btn" data-action="step-down" data-step-id="${escapeHtml(group.id)}" type="button">Down</button>
                        <button class="icon-btn" data-action="step-duplicate" data-step-id="${escapeHtml(group.id)}" type="button">Duplicate</button>
                        <button class="icon-btn" data-action="step-delete" data-step-id="${escapeHtml(group.id)}" type="button">Delete</button>
                    </div>
                </div>

                <div class="field-grid">
                    <label class="field">
                        <span>Group Name</span>
                        <input
                            data-bind="group-name"
                            data-group-id="${escapeHtml(group.id)}"
                            type="text"
                            maxlength="60"
                            value="${escapeHtml(group.name)}"
                        >
                    </label>
                    <label class="field">
                        <span>Group Repeats</span>
                        <input
                            data-bind="group-repeats"
                            data-group-id="${escapeHtml(group.id)}"
                            type="number"
                            min="1"
                            max="20"
                            step="1"
                            value="${escapeHtml(group.repeats)}"
                        >
                    </label>
                    <div class="helper-row">Items: ${escapeHtml(group.items.length)}<br>Total: ${escapeHtml(this.formatClock(groupDuration))}</div>
                </div>

                <div class="group-items">${itemsMarkup}</div>

                <div class="group-footer">
                    <button class="btn btn-secondary" data-action="group-add-item" data-group-id="${escapeHtml(group.id)}" type="button">Add Exercise</button>
                    <button class="btn btn-secondary" data-action="group-add-rest" data-group-id="${escapeHtml(group.id)}" type="button">Add Rest</button>
                </div>
            </article>
        `;
    }

    expandWorkout() {
        const sequence = [];

        for (const step of this.workout.steps) {
            if (step.type === "exercise") {
                for (let repeat = 1; repeat <= step.repeats; repeat += 1) {
                    sequence.push({
                        name: this.sanitizeName(step.name, "Exercise", 60),
                        duration: clampInt(step.duration, 1, 3600, 30),
                        detail: step.repeats > 1 ? `Rep ${repeat}/${step.repeats}` : "Single set"
                    });
                }
                continue;
            }

            if (step.type === "group") {
                for (let round = 1; round <= step.repeats; round += 1) {
                    for (const item of step.items) {
                        for (let itemRepeat = 1; itemRepeat <= item.repeats; itemRepeat += 1) {
                            sequence.push({
                                name: this.sanitizeName(item.name, "Exercise", 60),
                                duration: clampInt(item.duration, 1, 3600, 30),
                                detail: [
                                    `${this.sanitizeName(step.name, "Group", 60)} Round ${round}/${step.repeats}`,
                                    item.repeats > 1 ? `Rep ${itemRepeat}/${item.repeats}` : ""
                                ].filter(Boolean).join(" | ")
                            });
                        }
                    }
                }
            }
        }

        return sequence;
    }

    startWorkout() {
        if (this.runner.status !== "idle") {
            return;
        }
        this.ensureAudioContext();

        const sequence = this.expandWorkout();
        if (sequence.length === 0) {
            this.toast("Add at least one exercise before starting.", "error");
            return;
        }

        const totalDuration = sequence.reduce((total, item) => total + item.duration, 0);

        this.runner.sequence = sequence;
        this.runner.index = 0;
        this.runner.stepRemaining = sequence[0].duration;
        this.runner.totalDuration = totalDuration;
        this.runner.totalRemaining = totalDuration;
        this.runner.countdownRemaining = clampInt(this.workout.countdown, 0, 30, 5);

        this.showRunner();

        if (this.runner.countdownRemaining > 0) {
            this.setRunnerStatus("countdown");
            this.startCountdownTimer();
        } else {
            this.startRunTimer();
            this.setRunnerStatus("running");
        }

        this.updateRunnerUI();
    }

    showRunner() {
        this.runnerOverlay.classList.add("active");
        this.runnerOverlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("runner-open");
    }

    hideRunner() {
        this.runnerOverlay.classList.remove("active");
        this.runnerOverlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("runner-open");
    }

    setRunnerStatus(status) {
        this.runner.status = status;
        this.runnerOverlay.dataset.mode = status;
        this.updateRunnerControls();
    }

    isRestStep(step) {
        if (!step || typeof step.name !== "string") {
            return false;
        }
        return step.name.trim().toLowerCase() === "rest";
    }

    clearRunnerTimer() {
        if (this.runner.timerId) {
            window.clearInterval(this.runner.timerId);
            this.runner.timerId = null;
        }
    }

    startCountdownTimer() {
        this.clearRunnerTimer();
        this.runner.timerId = window.setInterval(() => {
            if (this.runner.status !== "countdown") {
                return;
            }

            this.runner.countdownRemaining -= 1;
            this.playTick();
            if (this.runner.countdownRemaining <= 0) {
                this.clearRunnerTimer();
                this.setRunnerStatus("running");
                this.startRunTimer();
                this.updateRunnerUI();
                return;
            }

            this.updateRunnerUI();
        }, 1000);
    }

    startRunTimer() {
        this.clearRunnerTimer();
        this.runner.timerId = window.setInterval(() => {
            if (this.runner.status !== "running") {
                return;
            }

            this.runner.stepRemaining = Math.max(0, this.runner.stepRemaining - 1);
            this.runner.totalRemaining = Math.max(0, this.runner.totalRemaining - 1);
            this.playTick();

            if (this.runner.stepRemaining <= 0) {
                this.advanceStep(false);
                return;
            }

            this.updateRunnerUI();
        }, 1000);
    }

    advanceStep(skipped) {
        if (skipped) {
            this.runner.totalRemaining = Math.max(0, this.runner.totalRemaining - this.runner.stepRemaining);
        }

        this.runner.index += 1;

        if (this.runner.index >= this.runner.sequence.length) {
            this.finishWorkout();
            return;
        }

        this.runner.stepRemaining = this.runner.sequence[this.runner.index].duration;

        if (this.runner.status === "paused") {
            this.updateRunnerUI();
            return;
        }

        this.setRunnerStatus("running");
        this.startRunTimer();
        this.updateRunnerUI();
    }

    togglePauseResume() {
        if (this.runner.status === "countdown") {
            this.clearRunnerTimer();
            this.setRunnerStatus("countdown-paused");
            this.updateRunnerUI();
            return;
        }

        if (this.runner.status === "countdown-paused") {
            this.setRunnerStatus("countdown");
            this.startCountdownTimer();
            this.updateRunnerUI();
            return;
        }

        if (this.runner.status === "running") {
            this.clearRunnerTimer();
            this.setRunnerStatus("paused");
            this.updateRunnerUI();
            return;
        }

        if (this.runner.status === "paused") {
            this.setRunnerStatus("running");
            this.startRunTimer();
            this.updateRunnerUI();
        }
    }

    skipCurrent() {
        if (this.runner.status === "finished" || this.runner.status === "idle") {
            return;
        }

        if (this.runner.status === "countdown" || this.runner.status === "countdown-paused") {
            this.clearRunnerTimer();
            this.runner.countdownRemaining = 0;
            this.setRunnerStatus("running");
            this.startRunTimer();
            this.updateRunnerUI();
            return;
        }

        this.advanceStep(true);
    }

    stopWorkout() {
        this.clearRunnerTimer();
        this.hideRunner();
        this.runner = this.createRunnerState();
        this.runnerOverlay.dataset.mode = "idle";
    }

    finishWorkout() {
        this.clearRunnerTimer();
        this.runner.stepRemaining = 0;
        this.runner.totalRemaining = 0;
        this.setRunnerStatus("finished");
        this.updateRunnerUI();
        this.toast("Workout complete.", "success");
    }

    updateRunnerControls() {
        const status = this.runner.status;

        if (status === "running" || status === "countdown") {
            this.pauseResumeBtn.textContent = "Pause";
            this.pauseResumeBtn.disabled = false;
        } else if (status === "paused" || status === "countdown-paused") {
            this.pauseResumeBtn.textContent = "Resume";
            this.pauseResumeBtn.disabled = false;
        } else if (status === "finished") {
            this.pauseResumeBtn.textContent = "Pause";
            this.pauseResumeBtn.disabled = true;
        } else {
            this.pauseResumeBtn.textContent = "Pause";
            this.pauseResumeBtn.disabled = true;
        }

        this.skipBtn.disabled = status === "finished" || status === "idle";
        this.skipBtn.textContent = (status === "countdown" || status === "countdown-paused") ? "Skip Countdown" : "Skip";
        this.stopBtn.textContent = status === "finished" ? "Close" : "Stop";
    }

    updateRunnerUI() {
        const status = this.runner.status;

        if (status === "idle") {
            return;
        }

        let stage = "";
        let exerciseName = "";
        let exerciseMeta = "";
        let timerLabel = "00:00";
        let stepDone = 0;
        let stepTotal = 0;

        if (status === "countdown" || status === "countdown-paused") {
            stage = status === "countdown" ? "Get Ready" : "Countdown Paused";
            exerciseName = this.workout.name;
            exerciseMeta = `${this.runner.sequence.length} intervals | ${this.formatClock(this.runner.totalDuration)} total`;
            timerLabel = String(this.runner.countdownRemaining);
            stepDone = 0;
            stepTotal = 1;
        } else if (status === "finished") {
            stage = "Workout Complete";
            exerciseName = "Great work";
            exerciseMeta = `${this.runner.sequence.length} intervals completed`;
            timerLabel = "00:00";
            stepDone = 1;
            stepTotal = 1;
        } else {
            const current = this.runner.sequence[this.runner.index];
            const safeCurrent = current || { name: "Exercise", detail: "", duration: 1 };

            stage = status === "paused" ? "Paused" : "Now";
            exerciseName = safeCurrent.name;
            exerciseMeta = `${safeCurrent.detail} | Interval ${this.runner.index + 1}/${this.runner.sequence.length}`;
            timerLabel = this.formatClock(this.runner.stepRemaining);
            stepDone = safeCurrent.duration - this.runner.stepRemaining;
            stepTotal = safeCurrent.duration;

            if (this.isRestStep(safeCurrent)) {
                this.runnerOverlay.dataset.phase = "rest";
            } else if (this.runner.stepRemaining <= 10) {
                this.runnerOverlay.dataset.phase = "warning";
            } else {
                this.runnerOverlay.dataset.phase = "work";
            }
        }

        const totalDone = this.runner.totalDuration - this.runner.totalRemaining;

        this.runnerStage.textContent = stage;
        this.runnerExerciseName.textContent = exerciseName;
        this.runnerExerciseMeta.textContent = exerciseMeta;
        this.runnerTimer.textContent = timerLabel;

        this.stepProgressText.textContent = `${this.formatClock(stepDone)} / ${this.formatClock(stepTotal)}`;
        this.totalProgressText.textContent = `${this.formatClock(totalDone)} / ${this.formatClock(this.runner.totalDuration)}`;

        this.stepProgressBar.style.width = `${this.percent(stepDone, stepTotal)}%`;
        this.totalProgressBar.style.width = `${this.percent(totalDone, this.runner.totalDuration)}%`;

        if (status === "countdown" || status === "countdown-paused" || status === "finished") {
            this.runnerOverlay.dataset.phase = "default";
        }

        this.updateRunnerControls();
    }

    percent(done, total) {
        if (total <= 0) {
            return 0;
        }
        return Math.min(100, Math.max(0, (done / total) * 100));
    }

    formatClock(totalSeconds) {
        const seconds = Math.max(0, Math.floor(totalSeconds || 0));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainder = seconds % 60;

        const pad = (value) => String(value).padStart(2, "0");

        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(remainder)}`;
        }

        return `${pad(minutes)}:${pad(remainder)}`;
    }

    sanitizeName(value, fallback, maxLength) {
        const text = typeof value === "string" ? value.trim() : "";
        if (!text) {
            return fallback;
        }
        return text.slice(0, maxLength);
    }

    sanitizeWorkout(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return null;
        }

        const raw = rawInput.workout && typeof rawInput.workout === "object" ? rawInput.workout : rawInput;

        const workout = {
            name: this.sanitizeName(raw.name, "My Workout", 80),
            countdown: clampInt(raw.countdown, 0, 30, 5),
            steps: []
        };

        if (!Array.isArray(raw.steps)) {
            return workout;
        }

        for (const rawStep of raw.steps) {
            if (!rawStep || typeof rawStep !== "object") {
                continue;
            }

            if (rawStep.type === "group") {
                const group = {
                    id: uid("group"),
                    type: "group",
                    name: this.sanitizeName(rawStep.name, "Group", 60),
                    repeats: clampInt(rawStep.repeats, 1, 20, 2),
                    items: []
                };

                if (Array.isArray(rawStep.items)) {
                    for (const rawItem of rawStep.items) {
                        if (!rawItem || typeof rawItem !== "object") {
                            continue;
                        }
                        group.items.push({
                            id: uid("item"),
                            name: this.sanitizeName(rawItem.name, "Exercise", 60),
                            duration: clampInt(rawItem.duration, 1, 3600, 30),
                            repeats: clampInt(rawItem.repeats, 1, 20, 1)
                        });
                    }
                }

                if (group.items.length === 0) {
                    group.items.push(createGroupItem());
                }

                workout.steps.push(group);
                continue;
            }

            workout.steps.push({
                id: uid("step"),
                type: "exercise",
                name: this.sanitizeName(rawStep.name, "Exercise", 60),
                duration: clampInt(rawStep.duration, 1, 3600, 30),
                repeats: clampInt(rawStep.repeats, 1, 20, 1)
            });
        }

        return workout;
    }

    persistWorkout() {
        const payload = {
            version: STORAGE_SCHEMA_VERSION,
            workout: this.workout
        };

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            this.toast("Could not save to local storage.", "error");
        }
    }

    loadWorkout() {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return buildDefaultWorkout();
        }

        try {
            const parsed = JSON.parse(raw);
            const workout = this.sanitizeWorkout(parsed);
            if (workout) {
                return workout;
            }
        } catch (error) {
            console.error("Failed to load saved workout", error);
        }

        return buildDefaultWorkout();
    }

    exportWorkout() {
        const payload = {
            version: STORAGE_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            workout: this.workout
        };

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const name = this.workout.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "workout";
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${name}.json`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        this.toast("Workout exported.", "success");
    }

    async importWorkout(event) {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const content = await file.text();
            const parsed = JSON.parse(content);
            const workout = this.sanitizeWorkout(parsed);
            if (!workout) {
                throw new Error("Invalid workout file");
            }

            this.workout = workout;
            this.commitAndRender();
            this.toast("Workout imported.", "success");
        } catch (error) {
            this.toast("Invalid JSON workout file.", "error");
        } finally {
            event.target.value = "";
        }
    }

    toast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.toastContainer.append(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 2600);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new WorkoutApp();
});
